// src/lib/romActivation.ts
//
// Pure helpers that turn a movement's per-muscle activation envelopes
// (RomMuscleActivation) into a live "who is working, and how hard, at THIS angle"
// readout for the movement lab. This is the premium counterpart to
// romPhaseAtAngle: phases answer "which teaching chunk am I in", activations
// answer "each muscle's recruitment level right now" so the lab can glow muscles
// smoothly and show exactly at what degree each one enters and peaks.
//
// LAB-ONLY: Explore/Learn keep using movement.phases. No React, no THREE.

import type {
  ActivationKnot,
  RomMovement,
  RomMuscleActivation,
  RomMuscleRole,
} from '../types/rom';

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Activation level of an envelope at a SIGNED angle. Linear between knots;
 * CLAMP-HELD at the first/last knot's level outside the knot range (so a single
 * knot is a constant level, and a muscle silent before recruitment starts with a
 * level-0 knot). Empty curve -> 0.
 */
export function levelAt(curve: ActivationKnot[], deg: number): number {
  const n = curve.length;
  if (n === 0) return 0;
  if (deg <= curve[0].deg) return clamp01(curve[0].level);
  if (deg >= curve[n - 1].deg) return clamp01(curve[n - 1].level);
  for (let i = 1; i < n; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (deg <= b.deg) {
      const span = b.deg - a.deg;
      const t = span === 0 ? 0 : (deg - a.deg) / span;
      return clamp01(a.level + t * (b.level - a.level));
    }
  }
  return clamp01(curve[n - 1].level);
}

/** A muscle recruited at the current angle, with its live level. */
export interface ActiveMuscle {
  muscleId: string;
  role: RomMuscleRole;
  /** Live recruitment level, 0..1. */
  level: number;
  note?: string;
}

/** Threshold below which a muscle is considered silent (hidden from the readout). */
export const ACTIVE_EPS = 0.02;

/**
 * The muscles recruited at `deg` (level > ACTIVE_EPS), strongest first. Returns
 * an empty array when the movement has no activation data (caller falls back to
 * the phase muscle list).
 */
export function activeMusclesAt(
  movement: RomMovement,
  deg: number,
  eps: number = ACTIVE_EPS,
): ActiveMuscle[] {
  const acts = movement.activations;
  if (!acts || acts.length === 0) return [];
  const out: ActiveMuscle[] = [];
  for (const a of acts) {
    const level = levelAt(a.curve, deg);
    if (level > eps) {
      out.push({ muscleId: a.muscleId, role: a.role, level, note: a.note });
    }
  }
  // Strongest first; stable enough for a short list (the muscle set is small).
  out.sort((x, y) => y.level - x.level);
  return out;
}

/** True when the movement carries per-muscle activation envelopes. */
export function hasActivations(movement: RomMovement): boolean {
  return !!movement.activations && movement.activations.length > 0;
}

/** Convenience: an envelope by muscle id, or undefined. */
export function activationFor(
  movement: RomMovement,
  muscleId: string,
): RomMuscleActivation | undefined {
  return movement.activations?.find((a) => a.muscleId === muscleId);
}
