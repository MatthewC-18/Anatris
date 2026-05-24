// src/types/muscleContent.ts
//
// Type definitions for the clinical/educational content attached to a muscle.
// Content lives in src/data/shoulderMuscles.ts (and future region files) and
// is keyed by a stable muscleId that the viewer resolves from a clicked mesh.
//
// Design goals:
//   - Every factual field carries its own citation(s), so the UI can show the
//     source next to the claim — this is the educational differentiator.
//   - Page numbers are optional and explicitly flagged as verified or not,
//     so unverified pages can be surfaced for confirmation rather than faked.
//   - Content is structured for LEARNING, not just reference: action hierarchy,
//     shortened/lengthened positions (for stretch & palpation reasoning), and
//     a dedicated palpation block.
//   - Spanish for user-facing strings; English for code/identifiers.

import type { ReferenceId } from '../data/references';

export interface Citation {
  ref: ReferenceId;
  /** Page or page range as printed, e.g. "p. 142" or "pp. 30-34". */
  page?: string;
  /** Chapter/section label if more useful than a page. */
  section?: string;
  /** True only when `page`/`section` was checked against the real edition. */
  pageVerified: boolean;
}

export interface SourcedText {
  /** The statement, in Spanish, user-facing. */
  text: string;
  /** One or more supporting citations. */
  cite: Citation[];
}

/**
 * The role an action plays for this muscle. Teaches hierarchy: a muscle's
 * defining action is not always its primary functional role.
 */
export type ActionRole = 'primary' | 'accessory';

export interface MuscleAction extends SourcedText {
  role: ActionRole;
}

export interface Innervation {
  /** e.g. "Nervio supraescapular". */
  nerve: SourcedText;
  /** Root levels, e.g. "C5-C6". Optional; some texts vary. */
  roots?: SourcedText;
}

/**
 * Positions in which the muscle is shortened vs lengthened. Direct input for
 * stretching, palpation-under-tension and treatment reasoning.
 */
export interface FunctionalPositions {
  shortened: SourcedText;
  lengthened: SourcedText;
}

/** Palpation guidance, separated from general clinical notes. */
export interface Palpation {
  howTo: SourcedText;
  position?: SourcedText;
}

export interface MuscleContent {
  /** Stable id, e.g. "supraspinatus". Matches the viewer's muscle resolver. */
  id: string;

  nameEs: string;
  nameLat: string;
  aliases?: string[];

  /** Functional group within the region, e.g. "Manguito rotador". */
  group?: string;

  origin: SourcedText;
  insertion: SourcedText;

  innervation: Innervation;

  /** Actions with primary/accessory hierarchy, each individually sourced. */
  actions: MuscleAction[];

  /** Shortened/lengthened positions (stretch & palpation reasoning). */
  functionalPositions?: FunctionalPositions;

  /** Kinesiology layer (Kapandji/Oatis) — the "think like a physio" angle. */
  biomechanics?: SourcedText[];

  /** How to palpate it (separate from general clinical notes). */
  palpation?: Palpation;

  /** Synergists / antagonists. Optional; aid relational learning. */
  synergists?: SourcedText[];
  antagonists?: SourcedText[];

  pathologies?: SourcedText[];

  /** Clinical pearls, special tests, treatment cues (palpation is separate). */
  clinicalNotes?: SourcedText[];
}

export type MuscleContentIndex = Record<string, MuscleContent>;
