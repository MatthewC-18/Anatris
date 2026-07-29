// src/lib/biomech/kneeCoupling.ts
//
// Pure biomechanical coupling for the KNEE's screw-home mechanism ("mecanismo de
// tornillo") — the knee's answer to the shoulder's scapulohumeral rhythm: an
// AUTOMATIC, obligatory tibial rotation coupled to sagittal flexion/extension, not
// a separate voluntary movement.
//
// MODEL (Kapandji / Oatis): in the last ~30 deg of EXTENSION the tibia rotates
// EXTERNALLY ~15 deg and locks the joint (both cruciates taut) so standing costs
// almost no muscle. To start flexion the popliteus "unlocks" it, rotating the tibia
// back internally. So the coupled external rotation is maximal at full extension
// (0 deg flexion) and unwinds to 0 by ~30 deg of flexion.
//
// MODELLED, NOT PAGE-EXACT: the 15 deg / 30 deg figures are the standard didactic
// values (they vary by source), same honesty discipline as ./shoulderChain. This is
// a READOUT model (it does not drive the rig); the lab shows it during knee
// flexion/extension so the coupling reads live, like the shoulder rhythm.
//
// ASCII source; no `any`.

/** Max coupled tibial external rotation at full extension, degrees (Kapandji ~15). */
const SCREW_HOME_ER_DEG = 15;
/** Flexion range over which the screw-home winds/unwinds, degrees. */
const SCREW_HOME_ARC_DEG = 30;

export type ScrewHomeZone = 'locked' | 'unlocking' | 'free';

export interface KneeScrewHome {
  /** Coupled automatic tibial EXTERNAL rotation at this flexion angle, degrees. */
  tibialErDeg: number;
  /** Fraction 0..1 of the screw-home wind (1 = fully locked at extension). */
  lockFraction: number;
  /** Which regime the joint is in at this angle. */
  zone: ScrewHomeZone;
}

/**
 * Coupled tibial rotation for a given knee FLEXION angle (0 = full extension,
 * positive = flexed). Clamped; negative treated as full extension.
 */
export function kneeScrewHome(flexionDeg: number): KneeScrewHome {
  const f = flexionDeg < 0 ? 0 : flexionDeg;
  const frac = f >= SCREW_HOME_ARC_DEG ? 0 : 1 - f / SCREW_HOME_ARC_DEG;
  const tibialErDeg = SCREW_HOME_ER_DEG * frac;
  const zone: ScrewHomeZone = f <= 2 ? 'locked' : f < SCREW_HOME_ARC_DEG ? 'unlocking' : 'free';
  return { tibialErDeg, lockFraction: frac, zone };
}
