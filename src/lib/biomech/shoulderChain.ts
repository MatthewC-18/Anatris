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
// Scapulohumeral rhythm is PHASE-VARIABLE, not a flat 2:1 (Inman; Anatris ROM
// table 1.2):
//   Phase 1 (0-30 deg, setting): scapula BARELY moves (~7:1). The first 30 deg of
//                                elevation is primarily glenohumeral; the scapula
//                                finds a stable "set" position with minimal
//                                upward rotation.
//   Phase 2 (30-90 deg):         ~2:1 transition (the classic overall ratio;
//                                modern 3D studies report ~2.0-2.3 during raising).
//   Phase 3 (90-140 deg):        PEAK scapular contribution -- the scapula rotates
//                                fastest here while obligatory humeral external
//                                rotation clears the greater tuberosity.
//   Phase 4 (140-180 deg):       scapula still leads to finish the arc, but its
//                                per-degree rate eases toward the top.
//
// The coefficients below are tuned so the WHOLE-ARC totals match the textbook
// figures: at 180 deg of elevation the glenohumeral joint contributes ~120 deg
// and scapular upward rotation ~60 deg (Inman/Oatis/Ludewig), i.e. an overall
// ~2:1 that is GH-dominant early (setting phase) and scapula-dominant late.
//
// Humeral external rotation engages after 90 deg (rolls the greater tuberosity
// clear of the acromion). The RAQUIS -- thoracic T12..T1 and lumbar L5..L1 --
// laterally flexes CONTRALATERALLY after 150 deg, weighted per region so the
// trunk bends along its whole length instead of hinging at one level.
//
// VERIFICATION STATUS: the phase boundaries (30/120 deg) and whole-arc totals
// (~120 deg GH / ~60 deg scapular) are now grounded in the biomechanics
// literature cited above, not free invention. What remains unconfirmed is the
// page-level locator in the project's physical Kapandji/Oatis copies (the app's
// pageVerified:false discipline) and the one-time axis-SIGN visual check
// (needsVisualCheck in boneMap). Keep the flag false until both are closed.

export const SHOULDER_CHAIN_VERIFIED = false;

const DEG = Math.PI / 180;

/**
 * PATHOLOGICAL modifier for the shoulder chain (P1 "normal vs patologico"). A
 * preset alters the NORMAL scapulohumeral rhythm to model a clinical picture, so
 * the SAME decomposition drives the rig AND the readout:
 *   - scapular dyskinesis: `scapulaGainMul` < 1 -> the scapula upwardly rotates
 *     less, so the humerus carries more of the arc (ratio climbs).
 *   - adhesive capsulitis / frozen shoulder: `elevationCapDeg` caps the arc, and a
 *     `scapulaGainMul` > 1 models the scapular "shrug" substitution.
 * Modelled + cited (see src/data/pathologies.ts), not free invention.
 * Absent/undefined fields leave the normal model untouched.
 */
export interface ShoulderChainMod {
  /** Multiply the scapular upward-rotation gain (dyskinesis < 1, substitution > 1). */
  scapulaGainMul?: number;
  /** Hard ceiling on elevation, degrees (frozen shoulder). Only caps the positive arc. */
  elevationCapDeg?: number;
}

/** Thresholds in radians. Four phases matching the AAOS/Oatis rhythm table: the
 *  scapular contribution PEAKS between 90 and 140 deg, then eases. */
const T_SCAP_P1 = 30 * DEG;   // setting phase end
const T_SCAP_P2 = 90 * DEG;   // 2:1 transition end
const T_SCAP_P3 = 140 * DEG;  // peak-scapular phase end
const T_HUM_ER = 90 * DEG;    // humeral external rotation onset
const T_SPINE = 150 * DEG;    // thoracic participation onset

/** Phase gains for scapular contribution (fraction of elevation WITHIN the
 *  phase). Tuned so the whole-arc totals still land on the textbook figures at
 *  180 deg while the per-degree scapular RATE peaks in the 90-140 window (the
 *  "maxima contribucion escapular" of the Anatris ROM table 1.2):
 *    scapula = 0.12*30 + 0.33*60 + 0.52*50 + 0.28*40
 *            = 3.6 + 19.8 + 26.0 + 11.2 = ~60.6 deg,
 *    glenohumeral = 180 - 60.6 = ~119 deg  (overall ~2:1, GH-dominant early,
 *    scapula-dominant and peaking late). */
const G_P1 = 0.12;  // 0-30    setting phase ~7:1 -> scapula barely moves
const G_P2 = 0.33;  // 30-90   ~2:1 transition
const G_P3 = 0.52;  // 90-140  PEAK scapular contribution (external rot obligated)
const G_P4 = 0.28;  // 140-180 scapula still leads but the rate eases

const G_HUM_ER = 0.6;          // humeral ER gain

// --- ADDUCTION IS NEVER PURELY FRONTAL --------------------------------------
//
// From the reference position (arm at the side), adduction in the frontal plane
// is MECHANICALLY IMPOSSIBLE: the limb is already against the trunk, and the
// trunk is what stops it. Kapandji states it plainly and gives the way out --
// adduction only exists combined with a FLEXION of 30 to 45 deg, which carries
// the limb in front of the body, or with a slight extension, which carries it
// behind. The cross-body version, the one the abduction arc runs into below 0,
// is the flexion one.
//
// The model had no such combination, so the negative end of the arc was a pure
// frontal sweep and the humerus rotated straight INTO the thorax: at -30 deg the
// forearm and the hand ended up inside the abdomen, visible through the skin.
//
// The gain spends the band's TOP at the end of the arc:
//   30 deg of cross-body adduction * 1.5 = 45 deg of flexion.
//
// It is the top and not the middle because the rig crosses the body with the
// ELBOW STRAIGHT, so the limb is one long lever that has to clear a convex
// abdomen along its whole length -- the hand is not the tight part, the middle
// of the forearm is. Measured over the band (scripts/measure-arm-clearance.mts,
// deepest penetration at -30 deg): 36 deg still buried 3.8 cm of forearm, 42 deg
// 1.5 cm, 45 deg 0.3 cm. Going past 45 would clear it completely and leave
// Kapandji's range to do it.
const G_CROSS_BODY_FLEX = 1.5;

// --- THE TRUNK LEAN IS THE WHOLE RAQUIS, NOT ITS TOP FIVE VERTEBRAE ---------
//
// The lean used to be spread over five upper thoracic vertebrae (T6..T2) and
// nothing else. On screen that reads as a rigid trunk with a hinge in it: the
// shoulders and head tip over while the ribcage below T6, the lumbar spine and
// the pelvis stay bolted upright. A physio reviewing the module said exactly
// that -- the trunk moves "en bloque", only its top segment participating.
//
// The Universite Lyon anatomie3d sequence on the humero-escapulo-raquideo
// rhythm is explicit about which segments intervene in the trunk's
// displacement: "el raquis lumbar (RL)" AND "el raquis torACico (RT)". So the
// lean is distributed over BOTH blocks -- twelve thoracic vertebrae (T12..T1)
// and five lumbar (L5..L1) -- with each level taking a share of the total.
//
// The share is not flat per vertebra, because the two regions are not equally
// mobile in the frontal plane. Lateral flexion capacity is roughly 30 deg
// across the whole thoracic spine (12 levels, ~2.5 deg each) against ~25 deg
// across the lumbar (5 levels, ~5 deg each), so a lumbar level bends about
// TWICE as much as a thoracic one (White & Panjabi, Clinical Biomechanics of
// the Spine; Neumann, Kinesiology). Weighting by that ratio gives
//   12 x 1 + 5 x 2 = 22 "thoracic-equivalent" units
// and the TOTAL trunk contribution is held at the same ~27 deg the model was
// tuned to at 180 deg (it is partitioned out of the elevation arc below, so
// changing it would move the readout):
//   thoracic ~ 27/22       = 1.23 deg per level  -> 14.7 deg over T12..T1
//   lumbar   ~ 2 x 27/22   = 2.45 deg per level  -> 12.3 deg over L5..L1
// i.e. each region spends about half its available lateral flexion, which is
// what an accessory trunk lean at the end of an elevation should cost.
//
// Gains are per RADIAN of elevation past T_SPINE (30 deg of arc = 0.5236 rad):
//   G = perLevelDeg * DEG / 0.5236
const G_SPINE_THORACIC_PER_VERT = 0.0409; // ~1.23 deg per thoracic level at 180
const G_SPINE_LUMBAR_PER_VERT = 0.0818;   // ~2.45 deg per lumbar level at 180
const THORACIC_LEAN_VERTS = [
  'vert_T12', 'vert_T11', 'vert_T10', 'vert_T9', 'vert_T8', 'vert_T7',
  'vert_T6', 'vert_T5', 'vert_T4', 'vert_T3', 'vert_T2', 'vert_T1',
] as const;
const LUMBAR_LEAN_VERTS = ['vert_L5', 'vert_L4', 'vert_L3', 'vert_L2', 'vert_L1'] as const;

// --- WHERE THE SCAPULAR UPWARD ROTATION ACTUALLY COMES FROM -----------------
//
// Scapular upward rotation is not one joint. The blade hangs off the clavicle,
// and the clavicle hangs off the sternum, so the ~60 deg the scapula turns
// against the THORAX is the sum of two joints (Inman 1944; Ludewig 2009;
// Neumann, Kinesiology of the Musculoskeletal System):
//
//   - the STERNOCLAVICULAR joint elevates the clavicle ~30 deg over the arc, and
//     does it EARLY: most of the clavicular elevation is spent by ~100 deg, after
//     which it plateaus;
//   - the ACROMIOCLAVICULAR joint turns the scapula on the clavicle for the
//     remaining ~30 deg, and does it LATE.
//
// The model used to give the whole 60 deg to the scapula bone alone, with the
// clavicle held still. That is what tore the girdle apart on screen, and it is
// also why the clavicle looked dead: it had no share of the movement.
//
// SC_SHARE is the fraction of the scapulothoracic rotation taken at the SC joint
// WITHIN each phase -- high early, low late, reproducing Inman's description:
//   clavicle = 0.80*3.6 + 0.65*19.8 + 0.38*26.0 + 0.22*11.2 = ~28.1 deg
//   acromioclavicular remainder                             = ~32.5 deg
// which lands both joints on their textbook totals while their SUM stays exactly
// the ~60.6 deg the phase gains were tuned for. The readout is unaffected: it
// reports the scapulothoracic TOTAL, which has not changed.
const SC_SHARE_P1 = 0.80; // 0-30    the girdle sets by rising on the clavicle
const SC_SHARE_P2 = 0.65; // 30-90   SC elevation still leads
const SC_SHARE_P3 = 0.38; // 90-140  the AC joint takes over
const SC_SHARE_P4 = 0.22; // 140-180 SC is near its ceiling

// Clavicular RETRACTION: the strut also swings backwards in the horizontal plane
// as the arm rises, ~20 deg by full elevation (Ludewig 2009). Modelled linearly
// on the positive arc -- the literature's retraction curve is close to linear and
// the rig has no landmark precise enough to justify shaping it further.
const G_CLAV_RETRACTION = 20 / 180;

export interface ShoulderChainPose {
  /**
   * Scapular upward rotation AT THE ACROMIOCLAVICULAR JOINT, radians (applied on
   * scapula local X). This is the blade's rotation ON THE CLAVICLE, not against
   * the thorax: the clavicle supplies the rest, and because the scapula bone is a
   * CHILD of the clavicle bone the two add up on the rig by themselves. For the
   * scapulothoracic total a physio would measure, use `readout.scapulaDeg`.
   */
  scapulaUpwardRot: number;
  /**
   * Scapular upward rotation against the THORAX, radians: the sum of the SC and
   * AC shares, and the figure the textbooks quote (~60 deg at 180). Not a rig
   * target -- the rig gets there by adding its two joints -- but the runtime's
   * scapulothoracic wrap table is calibrated against it.
   */
  scapulothoracicUpwardRot: number;
  /** Clavicular elevation at the sternoclavicular joint, radians (clavicle local X). */
  clavicleElevation: number;
  /** Clavicular retraction, radians, UNSIGNED (the rig signs it per side). */
  clavicleRetraction: number;
  /** Glenohumeral abduction, radians, SIGNED for local-Z (negative = abduction on R). */
  glenohumeralRot: number;
  /** Humeral external rotation, radians (applied on forearm_rot local Y). */
  humeralExtRot: number;
  /**
   * Obligatory FLEXION that accompanies cross-body adduction, radians, unsigned
   * and 0 for any elevation at or above neutral (see G_CROSS_BODY_FLEX). Only the
   * frontal arc uses it: on the sagittal arc the negative branch is extension,
   * which already clears the trunk on its own.
   *
   * NOT a per-bone rig target. The runtime aims the humeral shaft in the plane
   * the clinical angle is read in and keeps the out-of-plane component at its
   * rest value, so a flexion placed on the bone would be aimed straight back out
   * again; this is the angle the aim itself swings the shaft forward by.
   */
  crossBodyFlex: number;
  /** Thoracic lateral flexion per vertebra, radians (signed; applied on local Z). */
  thoracicLatFlexPerVert: number;
  /**
   * Lumbar lateral flexion per vertebra, radians (signed; local Z). Separate from
   * the thoracic share because a lumbar level bends about twice as much as a
   * thoracic one — a single per-vertebra number spread over both blocks is what
   * made the trunk look like it moved in one piece.
   */
  lumbarLatFlexPerVert: number;
  /** Thoracic vertebrae that receive the lateral flexion, head-ward order. */
  thoracicVerts: readonly string[];
  /** Lumbar vertebrae that receive the lateral flexion, head-ward order. */
  lumbarVerts: readonly string[];
  /**
   * Convenience: the segmental split in degrees, for UI readouts (the
   * humero-escapulo-raquideo rhythm, cumulative at the current angle).
   * `trunkDeg` is the total thoracic lateral flexion the raquis adds ABOVE 150 deg
   * (0 below), so the three read like the Universite Lyon "proporciones de
   * intervencion" of humero / escapula / tronco per sector.
   */
  readout: {
    ghDeg: number;
    scapulaDeg: number;
    trunkDeg: number;
    ratio: string;
  };
}

/**
 * Decompose an arm-elevation angle into the shoulder joint chain.
 * @param elevationDeg arm elevation 0..180 (clamped).
 * @param side 'R' | 'L' — sets the sign of abduction and contralateral lean.
 */
export function shoulderChain(
  elevationDeg: number,
  side: 'R' | 'L' = 'R',
  mod?: ShoulderChainMod,
): ShoulderChainPose {
  // Frozen-shoulder ceiling: cap the POSITIVE arc only (adduction is untouched).
  const capped =
    mod?.elevationCapDeg != null && elevationDeg > mod.elevationCapDeg
      ? mod.elevationCapDeg
      : elevationDeg;
  // Allow a NEGATIVE range for cross-body ADDUCTION (abduction arc, to -30) and
  // shoulder EXTENSION (flexion arc, to -60). Below neutral the motion is
  // essentially glenohumeral: no scapular upward rotation, no humeral ER, no
  // thoracic lean, so this negative branch is a pure GH sweep either way.
  const E = Math.max(-60, Math.min(180, capped)) * DEG;
  // Scapular rhythm / ER / spine lean only engage on POSITIVE elevation.
  const Ep = Math.max(0, E);

  // Scapular contribution: piecewise-accumulated, continuous across the four
  // phases (peak per-degree rate in the 90-140 window). seg(lo,hi) is how much of
  // Ep falls inside [lo,hi].
  const seg = (lo: number, hi: number): number =>
    Math.max(Math.min(Ep, hi) - lo, 0);
  // Pathological gain on the scapular contribution (dyskinesis < 1, frozen-shoulder
  // scapular substitution > 1). 1 = normal.
  const scapulaGainMul = mod?.scapulaGainMul ?? 1;
  const scapula =
    (G_P1 * seg(0, T_SCAP_P1) +
      G_P2 * seg(T_SCAP_P1, T_SCAP_P2) +
      G_P3 * seg(T_SCAP_P2, T_SCAP_P3) +
      G_P4 * seg(T_SCAP_P3, Infinity)) *
    scapulaGainMul;

  // Split that scapulothoracic rotation across the two joints that produce it.
  // Same per-phase accumulation, so the SC share is phase-correct rather than a
  // flat fraction of the total, and the two always sum back to `scapula`.
  const clavicleElevation =
    (G_P1 * SC_SHARE_P1 * seg(0, T_SCAP_P1) +
      G_P2 * SC_SHARE_P2 * seg(T_SCAP_P1, T_SCAP_P2) +
      G_P3 * SC_SHARE_P3 * seg(T_SCAP_P2, T_SCAP_P3) +
      G_P4 * SC_SHARE_P4 * seg(T_SCAP_P3, Infinity)) *
    scapulaGainMul;
  // What is left is the acromioclavicular rotation, which is what the scapula
  // BONE receives -- it is already riding the clavicle, so the rig adds the two.
  const acromioclavicular = scapula - clavicleElevation;

  const clavicleRetraction = Ep * G_CLAV_RETRACTION;

  // Glenohumeral carries the remainder of elevation. For E < 0 (adduction),
  // scapula is 0 so ghMagnitude = E (negative) -> pure glenohumeral adduction.
  // Note this uses the scapulothoracic TOTAL, not the AC share: what the humerus
  // does not have to supply is the whole girdle's contribution, however the
  // girdle divides it internally.
  const ghMagnitude = E - scapula;

  // Sign conventions (from the empirical axis test in Blender):
  //   Abduction on R = NEGATIVE local-Z; on L = POSITIVE.
  const sideSign = side === 'R' ? -1 : 1;
  const glenohumeralRot = sideSign * ghMagnitude;

  const humeralExtRot = Math.max(Ep - T_HUM_ER, 0) * G_HUM_ER;

  // Cross-body adduction carries the limb in FRONT of the trunk (see the gain
  // block). Ramps with how far below neutral the arc has gone, and is exactly 0
  // at and above neutral, so nothing on the positive arc changes.
  const crossBodyFlex = Math.max(-E, 0) * G_CROSS_BODY_FLEX;

  // Contralateral lateral flexion: R arm -> spine leans LEFT, and vice versa.
  // Distributed over the WHOLE raquis (see the gain block above): every thoracic
  // and lumbar level takes a share, so the trunk bends instead of hinging at T6.
  const spineSign = side === 'R' ? -1 : 1;
  const spineDrive = Math.max(Ep - T_SPINE, 0) * spineSign;
  const thoracicLatFlexPerVert = spineDrive * G_SPINE_THORACIC_PER_VERT;
  const lumbarLatFlexPerVert = spineDrive * G_SPINE_LUMBAR_PER_VERT;

  // Raw joint split from the scapulohumeral rhythm. These two DRIVE THE RIG
  // (scapulaUpwardRot / glenohumeralRot above) and are NOT touched — for E > 0
  // they sum to the full elevation.
  const ghRaw = ghMagnitude / DEG;
  const scapulaRaw = scapula / DEG;

  // Trunk (raquis) contribution to the FUNCTIONAL elevation. Kapandji's phase 3
  // (150-180 deg): the shoulder joint complex is near its ceiling, so the last
  // stretch to a true vertical is completed by the spine — contralateral lateral
  // flexion of the trunk for a single arm. Ramps from 0 at 150 deg to ~27 deg at
  // 180, summed over BOTH blocks: whichever way the per-level shares are tuned,
  // what the readout reports is the whole raquis's contribution.
  const trunkDeg =
    (Math.abs(thoracicLatFlexPerVert) * THORACIC_LEAN_VERTS.length +
      Math.abs(lumbarLatFlexPerVert) * LUMBAR_LEAN_VERTS.length) /
    DEG;

  // PARTITION, don't add on top. The slider angle is a FUNCTIONAL arm-vs-vertical
  // elevation, which already INCLUDES the trunk lean — so the measured degrees are
  // SHARED by gh + scapula + trunk, not gh + scapula (=full arc) PLUS an extra
  // trunk. Carve the trunk out of the top and rescale the joint split to fill the
  // remainder, preserving the GH:scapula rhythm ratio. Below 150 deg trunkDeg = 0,
  // so this is a no-op and the early/mid arc is unchanged. This keeps the readout
  // total equal to the goniometric angle (no phantom >180) and the trunk share
  // defensible against Kapandji's phase-3 spine contribution.
  const rhythmTotal = ghRaw + scapulaRaw;
  let ghDeg = ghRaw;
  let scapulaDeg = scapulaRaw;
  if (rhythmTotal > 0 && trunkDeg > 0) {
    const scale = Math.max(0, rhythmTotal - trunkDeg) / rhythmTotal;
    ghDeg = ghRaw * scale;
    scapulaDeg = scapulaRaw * scale;
  }
  const ratio = scapulaDeg > 0.1 ? `${(ghDeg / scapulaDeg).toFixed(1)}:1` : '—';

  return {
    scapulaUpwardRot: acromioclavicular,
    scapulothoracicUpwardRot: scapula,
    clavicleElevation,
    clavicleRetraction,
    glenohumeralRot,
    humeralExtRot,
    crossBodyFlex,
    thoracicLatFlexPerVert,
    lumbarLatFlexPerVert,
    thoracicVerts: THORACIC_LEAN_VERTS,
    lumbarVerts: LUMBAR_LEAN_VERTS,
    readout: { ghDeg, scapulaDeg, trunkDeg, ratio },
  };
}
