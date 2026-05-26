// src/types/rom.ts
//
// Range-of-motion (ROM) data model for a JOINT MOVEMENT — e.g. glenohumeral
// abduction, shoulder flexion, external rotation.
//
// KEY MODELING DECISION:
// Degrees belong to the MOVEMENT, not to a muscle. A muscle does not "have"
// degrees; it CONTRIBUTES to a range. So the primary entity here is the
// movement (with its joint and total range), and inside it we break the range
// into PHASES. Each phase says: "from A° to B°, these muscles are the players,
// and this is what's happening biomechanically." That phase breakdown is the
// teaching gold — it's how a physiotherapist reasons about which structure is
// loaded at which point in the arc.
//
// Muscles are referenced by the SAME id used in src/data/muscles/shoulder.ts
// (kebab-case, e.g. "supraspinatus", "teres-minor"), so a phase can later drive
// 3D highlighting directly through the existing resolver.
//
// CITATIONS: ROM degrees and phase contributions are sourced claims, so they
// carry the same Citation type used by the clinical content (Kapandji/Oatis,
// pageVerified:false until confirmed). One bibliography for the whole app.

import type { Citation } from './muscleContent';

/** The role a muscle plays within a single ROM phase. */
export type RomMuscleRole =
  | 'prime-mover' // the main engine of the movement in this phase
  | 'assistant' // helps, but isn't the principal driver
  | 'stabilizer'; // centers/controls the joint so the movement is clean

/** Spanish display labels for the muscle roles. */
export const ROM_ROLE_LABEL: Record<RomMuscleRole, string> = {
  'prime-mover': 'Motor principal',
  assistant: 'Asistente',
  stabilizer: 'Estabilizador',
};

/** A muscle's participation in one phase, by muscle id + role. */
export interface RomMuscleRef {
  /** Muscle id, kebab-case — matches src/data/muscles/shoulder.ts ids. */
  muscleId: string;
  role: RomMuscleRole;
  /** Optional one-line nuance about this muscle in this phase, Spanish. */
  note?: string;
}

/**
 * One phase of a movement's arc: a degree sub-range with its players and a
 * short biomechanical description.
 */
export interface RomPhase {
  /** Phase start in degrees (inclusive). */
  startDeg: number;
  /** Phase end in degrees (inclusive). */
  endDeg: number;
  /** Short Spanish label, e.g. "Inicio", "Rango medio", "Final". */
  label: string;
  /** What's happening biomechanically in this phase, Spanish, user-facing. */
  description: string;
  /** Muscles active in this phase, with their role. */
  muscles: RomMuscleRef[];
  /** Supporting citation(s) for this phase's claims. */
  cite: Citation[];
}

/**
 * A complete ROM movement: the joint, the plane/axis it happens in, the total
 * normal range, and the phase breakdown.
 */
export interface RomMovement {
  /** Stable id, kebab-case, e.g. "glenohumeral-abduction". */
  id: string;
  /** Spanish movement name, e.g. "Abducción". */
  name: string;
  /** The joint where it occurs, Spanish, e.g. "Glenohumeral". */
  joint: string;
  /** Anatomical plane, Spanish, e.g. "Frontal". Optional. */
  plane?: string;
  /** Total normal active range, in degrees. */
  totalRangeDeg: { min: number; max: number };
  /** Citation(s) for the total range figure. */
  rangeCite: Citation[];
  /** Optional clinical/biomechanical overview of the whole movement, Spanish. */
  overview?: string;
  /** The phase breakdown across the arc. */
  phases: RomPhase[];
  /** Optional region id this movement belongs to (e.g. "shoulder"). */
  region?: string;
}

export type RomMovementIndex = Record<string, RomMovement>;
