// src/lib/romPhaseAtAngle.ts
//
// Pure helpers that bridge the movement SLIDER (a live angle) to the existing
// ROM phase data. Given a movement and the current angle, they answer "which
// phase of the arc am I in, and which muscles are working right now" — the
// teaching payload the movement lab shows beside the moving 3D model.

import type { RomMovement, RomPhase } from '../types/rom';
import { MUSCLES_BY_REGION } from '../data/musclesByRegion';

export interface PhaseAtAngle {
  phase: RomPhase;
  index: number;
  /** Total number of phases, for "Fase 2 / 3" style labels. */
  total: number;
}

/**
 * The phase whose degree sub-range contains `angle`. Boundaries are inclusive;
 * at a shared boundary the EARLIER phase wins. Returns the last phase when the
 * angle is past the final boundary, and null only for an empty movement.
 */
export function phaseAtAngle(
  movement: RomMovement,
  angle: number,
): PhaseAtAngle | null {
  const phases = movement.phases;
  if (phases.length === 0) return null;
  for (let i = 0; i < phases.length; i++) {
    if (angle <= phases[i].endDeg) {
      return { phase: phases[i], index: i, total: phases.length };
    }
  }
  return {
    phase: phases[phases.length - 1],
    index: phases.length - 1,
    total: phases.length,
  };
}

/** Resolve a muscle id (e.g. "serratus-anterior") to its Spanish display name. */
export function muscleNameById(region: string, muscleId: string): string {
  const list = MUSCLES_BY_REGION[region];
  const hit = list?.find((m) => m.id === muscleId);
  if (hit) return hit.name;
  // Fallback: humanize the id so the UI never shows a raw slug.
  return muscleId
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
