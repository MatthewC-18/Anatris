// src/lib/romPhaseAtAngle.ts
//
// Pure helpers that bridge the movement SLIDER (a live angle) to the existing
// ROM phase data. Given a movement and the current angle, they answer "which
// phase of the arc am I in, and which muscles are working right now" — the
// teaching payload the movement lab shows beside the moving 3D model.

import type { RomMovement, RomPhase } from '../types/rom';
import { musclesForRomLookup } from '../data/musclesByRegion';

export interface PhaseAtAngle {
  phase: RomPhase;
  index: number;
  /** Total number of phases, for "Fase 2 / 3" style labels. */
  total: number;
}

/**
 * The continuous SIGNED arc the movement lab sweeps for a movement. When the
 * movement carries a `labReverse`, the negative-side phases are concatenated
 * before the positive ones and the range extends below 0; otherwise it is the
 * plain 0..max arc. `startAt` is the slider's initial angle so the gesture reads
 * from its anatomical start (a flexion that begins in extension). This is a
 * LAB-only view; Explore/Learn keep using movement.phases / totalRangeDeg as-is.
 */
export interface LabArc {
  min: number;
  max: number;
  /** Full phase list across the signed arc, ascending by degree. */
  phases: RomPhase[];
  /** Initial slider angle for the gesture. */
  startDeg: number;
  /** True when the arc crosses 0 (has an opposite-gesture side). */
  bidirectional: boolean;
}

export function buildLabArc(movement: RomMovement): LabArc {
  const rev = movement.labReverse;
  const posMax = movement.totalRangeDeg.max;
  const min = rev ? rev.minDeg : movement.totalRangeDeg.min;
  const phases = rev ? [...rev.phases, ...movement.phases] : movement.phases;
  const bidirectional = min < 0 && posMax > 0;
  // A BIDIRECTIONAL ARC NOW OPENS AT NEUTRAL, NOT AT THE OPPOSITE EXTREME.
  //
  // It used to open at `min`, the idea being that a gesture reads best from its
  // anatomical start. In practice that means choosing "Hombro" and landing on
  // -30 deg of cross-body ADDUCTION: a different gesture, with a different name,
  // which the panel duly announces ("Aducción") over a movement the user has not
  // asked for. It is also the most extreme, most occluded frame in the whole
  // arc, so the first thing anyone sees of the laboratory is its hardest pose.
  //
  // Zero is where a goniometer starts. The body stands neutral, the name in the
  // panel matches the movement that was picked, and pressing play sweeps it.
  // The opposite half of the arc is one drag away and loses nothing.
  //
  // An EXPLICIT labStartAt still wins: the knee and the elbow set 'max' on
  // purpose, because their extension arc shares the flexion arc and only makes
  // sense beginning flexed.
  const startAt = movement.labStartAt;
  const startDeg =
    startAt === 'max' ? posMax : startAt === 'min' ? min : bidirectional ? 0 : min;
  return { min, max: posMax, phases, startDeg, bidirectional };
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
  return phaseAtAngleIn(movement.phases, angle);
}

/**
 * Same as phaseAtAngle but over an EXPLICIT phase list (e.g. the lab's combined
 * signed arc from buildLabArc). Boundaries inclusive; earlier phase wins at a
 * shared boundary; last phase past the final boundary. Works with negative
 * degrees as long as the phases are ordered ascending.
 */
export function phaseAtAngleIn(
  phases: RomPhase[],
  angle: number,
): PhaseAtAngle | null {
  if (phases.length === 0) return null;
  // ZERO IS THE ONE BOUNDARY WHERE "EARLIER WINS" IS THE WRONG ANSWER.
  //
  // On a bidirectional arc the phase that ENDS at 0 belongs to the opposite
  // gesture: the last slice of adduction, of extension, of internal rotation.
  // Now that the lab opens at neutral, the generic rule had the panel announce
  // "Abducción" in its title and then describe an adduction underneath it, on
  // the very first frame. At exactly 0 the gesture that is about to happen is
  // the one the user picked, so the phase that STARTS there wins.
  if (angle === 0) {
    const starts = phases.findIndex((p) => p.startDeg === 0);
    if (starts >= 0) return { phase: phases[starts], index: starts, total: phases.length };
  }
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
  // Go through the ACCESSOR, not the raw registry. Since the paid content moved
  // behind the entitlement check, `MUSCLES_BY_REGION` holds the free tier only,
  // so a direct lookup missed in all seven paid regions and fell through to the
  // humaniser below -- which prints the id. The lab was showing a subscriber
  // "Popliteus", "Semimembranosus" and "Biceps Femoris" instead of the Spanish
  // names sitting in the data it had already downloaded.
  //
  // `musclesForRomLookup` (not `musclesForRegion`) because a spine movement
  // legitimately recruits muscles authored in a neighbouring sub-region: a
  // thoracic rotation names the abdominal wall, which lives in the lumbar list.
  const hit = musclesForRomLookup(region).find((m) => m.id === muscleId);
  if (hit) return hit.name;
  // Last resort: humanize the id so the UI never shows a raw slug. Reaching
  // here now means the id really is absent from the data, not that the content
  // simply had not loaded.
  return muscleId
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
