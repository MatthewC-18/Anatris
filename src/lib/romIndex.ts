// src/lib/romIndex.ts
//
// The ROM data (src/data/shoulderRom.ts) is organized BY MOVEMENT: each
// movement holds phases, each phase holds the muscles active in it. That's the
// natural shape for the "study a gesture" view (mode A).
//
// For the "study a muscle" view (mode B) we need the inverse: given a muscle,
// in which movements and degree ranges does it participate, and with what role?
// This module builds that inverted index with a pure function — no React, no
// store — so it's trivial to reason about and reuse.
//
// We don't touch the source data; we derive from it. Call buildRomMuscleIndex
// once (memoized) and look muscles up by id.

import type { RomMovement, RomMuscleRole } from '../types/rom';

/**
 * One appearance of a muscle inside a movement's phase: which movement, which
 * phase (by index, for highlighting), the degree sub-range, the role, and the
 * optional per-phase note for this muscle.
 */
export interface RomParticipation {
  movementId: string;
  movementName: string;
  /** Index of the phase within the movement's `phases` array. */
  phaseIndex: number;
  phaseLabel: string;
  startDeg: number;
  endDeg: number;
  role: RomMuscleRole;
  note?: string;
}

/** muscleId -> all the (movement, phase) slots where it participates. */
export type RomMuscleIndex = Map<string, RomParticipation[]>;

/**
 * Invert a list of movements into a per-muscle index. A muscle that appears in
 * several phases (or several movements) gets one RomParticipation per slot, in
 * source order, so the UI can list "Abducción 0°–15° · Motor principal", etc.
 */
export function buildRomMuscleIndex(movements: RomMovement[]): RomMuscleIndex {
  const index: RomMuscleIndex = new Map();

  for (const movement of movements) {
    movement.phases.forEach((phase, phaseIndex) => {
      for (const ref of phase.muscles) {
        const entry: RomParticipation = {
          movementId: movement.id,
          movementName: movement.name,
          phaseIndex,
          phaseLabel: phase.label,
          startDeg: phase.startDeg,
          endDeg: phase.endDeg,
          role: ref.role,
          note: ref.note,
        };
        const list = index.get(ref.muscleId);
        if (list) list.push(entry);
        else index.set(ref.muscleId, [entry]);
      }
    });
  }

  return index;
}

/**
 * The ordered list of muscle ids that actually have ROM participations, so the
 * "by muscle" picker only offers muscles with something to show. Order follows
 * first appearance across the movements.
 */
export function romMuscleIds(index: RomMuscleIndex): string[] {
  return Array.from(index.keys());
}
