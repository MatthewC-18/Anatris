// src/lib/biomech/shoulderChain.ts
//
// Pure biomechanical decomposition of shoulder elevation into the joint chain.
// This is the TypeScript port of the Blender driver model built in copia_fisio.blend.
//
// DESIGN (matches the Blender rig exactly):
//   Master input  = arm elevation angle (what a physio measures with a goniometer),
//                   0..180 deg. Drives bone `elevation_master`.
//   Output        = per-bone rotations the R3F animation layer applies each frame.
//
// Scapulohumeral rhythm is PHASE-VARIABLE (Oatis), not a flat 2:1 (Inman):
//   Phase 1 (0-30 deg, setting): ~4:1, scapula barely moves.
//   Phase 2 (30-120 deg):        ~2:1 transition.
//   Phase 3 (120-180 deg):       GH saturates, scapula predominates.
//
// Humeral external rotation engages after 90 deg (clears the acromion).
// Thoracic spine (T6..T2) laterally flexes CONTRALATERALLY after 150 deg.
//
// IMPORTANT — clinical verification status: the phase coefficients and thresholds
// below are MODELLING DRAFTS, not yet validated against Kapandji / Oatis physical
// references. They are flagged for review (see VERIFIED below). Do not present the
// numeric split as clinically authoritative until verified.

export const SHOULDER_CHAIN_VERIFIED = false;

const DEG = Math.PI / 180;

/** Thresholds in radians (mirror the Blender driver expressions). */
const T_SCAP_P1 = 30 * DEG;   // setting phase end
const T_SCAP_P2 = 120 * DEG;  // mid phase end
const T_HUM_ER = 90 * DEG;    // humeral external rotation onset
const T_SPINE = 150 * DEG;    // thoracic participation onset

/** Phase gains for scapular contribution (fraction of elevation-over-threshold). */
const G_P1 = 0.2;   // ~4:1  -> scapula gets 1/5
const G_P2 = 0.333; // ~2:1  -> scapula gets 1/3
const G_P3 = 0.55;  // GH saturating, scapula takes the majority (tuned down from 0.75)

const G_HUM_ER = 0.6;          // humeral ER gain
const G_SPINE_PER_VERT = 0.18; // per-vertebra lateral-flexion gain
const SPINE_VERTS = ['vert_T6', 'vert_T5', 'vert_T4', 'vert_T3', 'vert_T2'] as const;

export interface ShoulderChainPose {
  /** Scapular upward rotation, radians (applied on scapula local X). */
  scapulaUpwardRot: number;
  /** Glenohumeral abduction, radians, SIGNED for local-Z (negative = abduction on R). */
  glenohumeralRot: number;
  /** Humeral external rotation, radians (applied on forearm_rot local Y). */
  humeralExtRot: number;
  /** Thoracic lateral flexion per vertebra, radians (signed; applied on local Z). */
  thoracicLatFlexPerVert: number;
  /** Vertebrae that receive the lateral flexion, head-ward order. */
  thoracicVerts: readonly string[];
  /** Convenience: the GH/scapula split in degrees, for UI readouts. */
  readout: { ghDeg: number; scapulaDeg: number; ratio: string };
}

/**
 * Decompose an arm-elevation angle into the shoulder joint chain.
 * @param elevationDeg arm elevation 0..180 (clamped).
 * @param side 'R' | 'L' — sets the sign of abduction and contralateral lean.
 */
export function shoulderChain(elevationDeg: number, side: 'R' | 'L' = 'R'): ShoulderChainPose {
  // Allow a small NEGATIVE range for cross-body ADDUCTION (movement lab sweeps a
  // signed abduction/adduction arc). Adduction from neutral is essentially
  // glenohumeral: no scapular upward rotation, no humeral ER, no thoracic lean.
  const E = Math.max(-40, Math.min(180, elevationDeg)) * DEG;
  // Scapular rhythm / ER / spine lean only engage on POSITIVE elevation.
  const Ep = Math.max(0, E);

  // Scapular contribution: piecewise-accumulated, continuous across phases.
  const scapula =
    G_P1 * Math.min(Ep, T_SCAP_P1) +
    G_P2 * Math.max(Math.min(Ep, T_SCAP_P2) - T_SCAP_P1, 0) +
    G_P3 * Math.max(Ep - T_SCAP_P2, 0);

  // Glenohumeral carries the remainder of elevation. For E < 0 (adduction),
  // scapula is 0 so ghMagnitude = E (negative) -> pure glenohumeral adduction.
  const ghMagnitude = E - scapula;

  // Sign conventions (from the empirical axis test in Blender):
  //   Abduction on R = NEGATIVE local-Z; on L = POSITIVE.
  const sideSign = side === 'R' ? -1 : 1;
  const glenohumeralRot = sideSign * ghMagnitude;

  const humeralExtRot = Math.max(Ep - T_HUM_ER, 0) * G_HUM_ER;

  // Contralateral lateral flexion: R arm -> spine leans LEFT, and vice versa.
  const spineSign = side === 'R' ? -1 : 1;
  const thoracicLatFlexPerVert = Math.max(Ep - T_SPINE, 0) * G_SPINE_PER_VERT * spineSign;

  const ghDeg = ghMagnitude / DEG;
  const scapulaDeg = scapula / DEG;
  const ratio = scapulaDeg > 0.1 ? `${(ghDeg / scapulaDeg).toFixed(1)}:1` : '—';

  return {
    scapulaUpwardRot: scapula,
    glenohumeralRot,
    humeralExtRot,
    thoracicLatFlexPerVert,
    thoracicVerts: SPINE_VERTS,
    readout: { ghDeg, scapulaDeg, ratio },
  };
}
