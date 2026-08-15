// src/lib/boneMap.ts
//
// THE CONTRACT between the clinical ROM data (src/data/*Rom.ts, keyed by
// movementId) and the biomechanical rig (public/cuerpo-rig.glb). glTF does NOT
// carry Blender drivers, and left/right bones share the SAME name, so this map
// encodes everything the runtime needs to drive a bone correctly:
//
//   - which armature subtree the bone lives in (so we descend from the unique
//     armature root and never hit the name collision between sides),
//   - which LOCAL axis to rotate and the SIGN per side for a POSITIVE clinical
//     angle (signs verified against the rig handoff table),
//   - the clinical range (degrees),
//   - the automatic couplings to replicate each frame (scapulohumeral rhythm,
//     patellar glide) since those Blender drivers don't survive the export.
//
// This file is framework-agnostic: NO three.js import. Couplings are pure
// number -> number functions in RADIANS, so the runtime stays the only place
// that touches THREE. Bone/armature/axis names are VERIFIED from the GLB via
// scripts/dump-rig.mjs (5 skins, 65 bones), not from memory.
//
// Mapping clinical degrees -> bone local rotation is linear 1:1 (rest-pose
// offsets ~1-3 deg are negligible per the handoff).
//
// Some movements are NOT a single bone + same-armature couplings: shoulder
// elevation is a phase-variable scapulohumeral rhythm WITH humeral external
// rotation and contralateral thoracic participation, and the thoracic vertebrae
// live in a DIFFERENT armature. Those use `kind: 'chain'`, whose decomposition
// is the pure, clinically-modelled function in ./biomech/shoulderChain.

import { shoulderChain, type ShoulderChainMod } from './biomech/shoulderChain';

export type RigAxis = 'x' | 'y' | 'z';
export type Side = 'R' | 'L';

/** Paired-limb armature families. Runtime resolves `${base}_${side}`. */
export type LimbArmatureBase = 'Shoulder_Armature' | 'Leg_Armature';

/**
 * One automatic coupling (a replicated Blender driver). `bone` is resolved
 * INSIDE the same armature subtree as the primary bone. `follow` maps the
 * primary bone's applied local angle (rad) to the follower's local angle (rad).
 */
export interface BoneCoupling {
  bone: string;
  axis: RigAxis;
  follow: (primaryRad: number) => number;
}

/**
 * A joint held in a FIXED position for the whole movement, because that is the
 * position the movement is examined in.
 *
 * Unlike a coupling, this does not follow the driven angle: it is a posture, so
 * it is held at every angle INCLUDING 0, and the model opens already in the
 * examination position. Shoulder rotation is the case that forced it -- with the
 * elbow straight, humeral rotation is a cylinder turning about its own axis and
 * nothing visible happens, which is not how any physio reads that range.
 */
export interface ExamPosture {
  bone: string;
  axis: RigAxis;
  /** Clinical degrees held, positive in the direction `sign` describes. */
  deg: number;
  sign: Record<Side, 1 | -1>;
  /** Spanish, user-facing: why the model starts here rather than at anatomical zero. */
  reason: string;
}

/** A single-bone (limb) joint movement. */
export interface JointControl {
  kind: 'joint';
  armatureBase: LimbArmatureBase;
  bone: string;
  axis: RigAxis;
  /** Local-rotation sign for a POSITIVE clinical angle, per side. */
  sign: Record<Side, 1 | -1>;
  clinicalRange: { min: number; max: number };
  couplings?: BoneCoupling[];
  /** Joints held in the examination position for the whole arc. */
  posture?: ExamPosture[];
  /**
   * The gesture STARTS at `clinicalRange.max` and travels toward 0, instead of
   * the usual 0 -> max.
   *
   * Needed by the movements that share one physical arc with their opposite: at
   * the elbow and the knee, 0 deg is the fully EXTENDED joint and the maximum is
   * full flexion, so "extension" is the return toward 0. A demo that swept 0 ->
   * 120 and held there showed a joint bent to 120 under the label "extensión de
   * codo" -- the opposite of the movement named. A physio reviewing the myotomes
   * wrote exactly that: "C7 no hay extensión de codo".
   */
  arcFrom?: 'max';
  /**
   * True when the axis SIGN could not be derived from the handoff (longitudinal
   * rotations, lateral bending). The kinematics are correct; only the +/-
   * direction may need a one-time visual flip during calibration.
   */
  needsVisualCheck?: boolean;
}

/**
 * A spine movement: one regional clinical angle distributed across a block of
 * vertebrae in the single Spine_Armature. Motion accumulates up the chain, so
 * each listed vertebra takes a share of the total.
 */
export interface SpineControl {
  kind: 'spine';
  armature: 'Spine_Armature';
  /** Vertebra bones to spread the angle over, base -> apex. */
  bones: string[];
  axis: RigAxis;
  sign: 1 | -1;
  clinicalRange: { min: number; max: number };
  /** Per-level weights (same order/length as `bones`); omitted = uniform. */
  weights?: number[];
  needsVisualCheck?: boolean;
}

/**
 * Where one named output of a chain decomposition lands on the rig.
 * `armature: 'shoulder'` resolves to Shoulder_Armature_{side}; `'spine'` is the
 * single Spine_Armature. Every bone in `bones` receives the SAME value on `axis`
 * (e.g. each thoracic vertebra gets the per-level lateral flexion).
 */
export interface ChainTarget {
  armature: 'shoulder' | 'spine';
  bones: string[];
  axis: RigAxis;
}

/**
 * A multi-bone, possibly cross-armature movement. `decompose` is a PURE
 * clinical-angle -> named-radian-outputs function (the scapulohumeral-rhythm
 * model); `targets` says where each named output lands. Unlike same-armature
 * couplings, targets may span armatures (shoulder + spine) and several may hit
 * the SAME bone on different local axes -- the runtime composes them in array
 * order (so list the primary rotation before secondary ones on a shared bone).
 */
export interface ChainControl {
  kind: 'chain';
  /**
   * Pure clinical-angle -> named-radian-outputs. Accepts an optional pathological
   * modifier (P1) so the SAME decomposition that drives the rig also reflects a
   * preset (dyskinesis / frozen shoulder); undefined = the normal model.
   */
  decompose: (clinicalDeg: number, side: Side, mod?: ShoulderChainMod) => Record<string, number>;
  targets: { key: string; target: ChainTarget }[];
  clinicalRange: { min: number; max: number };
  /**
   * World axis the CLINICAL angle is measured around, so the runtime can aim the
   * limb at exactly that angle after the chain has run ('z' = frontal plane, for
   * abduction; 'x' = sagittal, for flexion).
   *
   * Needed because the rig's humeral abduction axis is not quite in the frontal
   * plane: the arm sweeps a shallow cone, gains a clean degree per degree up to
   * ~150 and then stalls, topping out near 157 no matter how far the bone is
   * turned (measured). Without this, 180 deg of goniometric elevation drew an arm
   * at 150. The aim is a small residual correction over the chain's own rotations,
   * so the scapulohumeral rhythm still drives the shape of the movement.
   */
  aimPlane?: 'x' | 'z';
  needsVisualCheck?: boolean;
}

/** A clinically real movement the current rig cannot reproduce. */
export interface UnsupportedControl {
  kind: 'unsupported';
  /** Spanish, user-facing: why it isn't drivable yet. */
  reason: string;
}

export type BoneControl =
  | JointControl
  | SpineControl
  | ChainControl
  | UnsupportedControl;

// ---------------------------------------------------------------------------
// Coupling factories (replicated Blender drivers).
// ---------------------------------------------------------------------------

// Scapulohumeral rhythm is no longer a flat same-armature coupling: shoulder
// elevation now uses the phase-variable chain model (see glenohumeral-abduction
// below, decomposed by ./biomech/shoulderChain), which also drives humeral
// external rotation and thoracic participation.

/**
 * The elbow held at 90 deg, the position shoulder rotation is examined in. Same
 * bone/axis/sign as `elbow-flexion`, so it flexes and never hyperextends.
 */
const ELBOW_AT_90: ExamPosture = {
  bone: 'forearm_flex',
  axis: 'x',
  deg: 90,
  sign: { R: 1, L: -1 },
  reason:
    'La rotación del hombro se explora con el codo a 90° y pegado al cuerpo: el ' +
    'antebrazo es la aguja que marca el ángulo. Con el codo estirado el húmero ' +
    'gira sobre su propio eje y no se aprecia nada.',
};

/** Patellar glide: patella tracks the knee. patella.x = shin_flex.x * 0.5 */
const patellarGlide: BoneCoupling = {
  bone: 'patella',
  axis: 'x',
  follow: (primaryRad) => primaryRad * 0.5,
};

// ---------------------------------------------------------------------------
// HIP ADDUCTION HAS THE OTHER LEG IN THE WAY.
//
// Adduction from the reference position runs into the same wall at the hip as it
// does at the shoulder: in the pure frontal plane the limb is stopped by the
// body -- here by the contralateral limb, which in the clinic is moved aside, or
// the movement is examined with the limb passing IN FRONT of it. A rig that just
// keeps rotating drives one thigh into the other: measured with
// scripts/measure-limb-collision.mts, 8.2 cm of thigh inside the stance thigh at
// 15 deg, on a 20 deg arc.
//
// So the femur takes a flexion that carries the limb across the FRONT, ramped
// exactly as the shoulder's is (see shoulderChain's crossBodyRamp and the reason
// it leads rather than tracks: the stance leg is in the way from the first
// degree, and once the limb is in front there is nothing left to buy).
//
// The sign comes for free. hip-flexion and hip-adduction carry the SAME per-side
// sign map ({R:1, L:-1}), so a coupling proportional to the signed adduction is
// already a forward flexion on both sides.
const HIP_CROSS_OVER_END = (20 * Math.PI) / 180;
const HIP_CROSS_OVER_FLEX_MAX = (25 * Math.PI) / 180;

const hipCrossOverFlexion: BoneCoupling = {
  bone: 'femur_base',
  axis: 'x',
  follow: (primaryRad) => {
    const t = Math.min(Math.abs(primaryRad) / HIP_CROSS_OVER_END, 1);
    return Math.sign(primaryRad) * Math.sin(t * (Math.PI / 2)) * HIP_CROSS_OVER_FLEX_MAX;
  },
};

// ---------------------------------------------------------------------------
// Vertebra blocks (base -> apex), verified against the Spine_Armature joints.
// ---------------------------------------------------------------------------

const LUMBAR_BONES = ['vert_L5', 'vert_L4', 'vert_L3', 'vert_L2', 'vert_L1'];
const THORACIC_BONES = [
  'vert_T12', 'vert_T11', 'vert_T10', 'vert_T9', 'vert_T8', 'vert_T7',
  'vert_T6', 'vert_T5', 'vert_T4', 'vert_T3', 'vert_T2', 'vert_T1',
];
const CERVICAL_BONES = [
  'vert_C7', 'vert_C6', 'vert_C5', 'vert_C4', 'vert_C3', 'vert_C2', 'vert_C1',
];

// Vertebrae that carry the contralateral trunk lean at the top of shoulder
// elevation. The lean used to sit on five upper thoracic levels only, which made
// the trunk tip over as one rigid piece hinged at T6 -- the physio's "solo se
// mueve la parte de arriba de la columna". It now runs down the WHOLE raquis,
// thoracic and lumbar, exactly as shoulderChain's THORACIC_LEAN_VERTS /
// LUMBAR_LEAN_VERTS list them; the per-level ANGLES differ between the blocks
// (a lumbar level bends about twice as much), which is why they are two targets
// and not one. Keep both lists in step with that file, which sizes each region's
// per-vertebra angle by its own count.
const SHOULDER_THORACIC_LEAN = THORACIC_BONES;
const SHOULDER_LUMBAR_LEAN = LUMBAR_BONES;

// ---------------------------------------------------------------------------
// THE MAP: clinical movementId (from *Rom.ts) -> bone control.
// ---------------------------------------------------------------------------

export const BONE_MAP: Record<string, BoneControl> = {
  // --- SHOULDER (Shoulder_Armature_*, chain clavicle->scapula->humerus_gh->...)
  // Phase-variable scapulohumeral rhythm (Oatis): GH carries the remainder of
  // total elevation while the scapula upwardly rotates ~4:1 -> ~2:1 -> scapula-
  // predominant; the humerus externally rotates past 90 deg and the thoracic
  // spine leans contralaterally past 150 deg. shoulderChain() does the clinical
  // decomposition; here we only place each output on the rig. Several outputs
  // hit humerus_gh on different axes (abduction Z, external rotation Y), so the
  // primary (humerus Z) is listed first and the runtime composes in order.
  // Axis SIGNS visually calibrated in the lab (abduction elevates + and out, the
  // scapula upwardly rotates ~49 deg at 140 deg). SHOULDER_CHAIN_VERIFIED stays
  // false only for the textbook phase-model locators, not the rig direction.
  'glenohumeral-abduction': {
    kind: 'chain',
    clinicalRange: { min: 0, max: 180 },
    decompose: (deg, side, mod) => {
      const p = shoulderChain(deg, side, mod);
      // External rotation sign matches glenohumeral-external-rotation below
      // (R: -1, L: +1). shoulderChain returns it unsigned. Flipped along with
      // those two: while the rotations were swapped, the obligatory external
      // rotation of elevation was driving the humerus INTERNALLY, which turns the
      // greater tuberosity INTO the acromion instead of clearing it out from
      // under the arch -- the opposite of what this rotation exists to do.
      const erSign = side === 'R' ? -1 : 1;
      return {
        humerus: p.glenohumeralRot,        // local-Z, already signed per side
        humeralER: p.humeralExtRot * erSign, // local-Y
        scapula: p.scapulaUpwardRot,        // local-X (positive both sides)
        // STERNOCLAVICULAR joint. The clavicle is the PARENT of the scapula, so
        // its elevation carries the blade with it and the two rotations add up on
        // the rig exactly as they do in the body. Elevation is +X on both sides
        // (measured: +20 deg raises the scapula 5.2 cm on each), retraction is
        // mirrored, so the sign lives here.
        clavicle: p.clavicleElevation,
        clavicleRetraction: p.clavicleRetraction * (side === 'R' ? 1 : -1),
        // NOT a rig target: the scapulothoracic TOTAL, published so the runtime's
        // scapulothoracic wrap keeps being fed the angle its table was calibrated
        // against. `scapula` above is only the acromioclavicular share.
        scapulaTotal: p.scapulothoracicUpwardRot,
        // ALSO NOT a rig target. Below neutral this arc is cross-body adduction,
        // which the body can only perform combined with flexion -- otherwise the
        // limb is driven into the thorax. It is published rather than placed on
        // the humerus because the aim (aimPlane 'z') rebuilds the shaft direction
        // from the REST pose and preserves its out-of-plane component, so a
        // flexion written to the bone here would be undone a few lines later. The
        // aim reads this and swings the shaft forward itself.
        crossBodyFlex: p.crossBodyFlex,
        // The lean must be CONTRALATERAL -- the trunk bends away from the rising
        // arm, which is what lets the arm finish vertical. shoulderChain signs it
        // for an anatomical axis; on the rig's vertebra local-Z that sign comes
        // out IPSILATERAL, which pushed the arm back DOWN (measured: 149.5 -> 143.5
        // deg at 160). Flipped here, at the point where the value meets the rig,
        // so the clinical model keeps its own convention.
        thoracic: -p.thoracicLatFlexPerVert,
        lumbar: -p.lumbarLatFlexPerVert,
      };
    },
    targets: [
      { key: 'humerus', target: { armature: 'shoulder', bones: ['humerus_gh'], axis: 'z' } },
      { key: 'humeralER', target: { armature: 'shoulder', bones: ['humerus_gh'], axis: 'y' } },
      { key: 'scapula', target: { armature: 'shoulder', bones: ['scapula'], axis: 'x' } },
      // The clavicle is the ROOT of the shoulder chain, so it must be listed
      // before nothing in particular -- but elevation is its primary rotation and
      // retraction is the secondary one on the same bone, so keep that order.
      { key: 'clavicle', target: { armature: 'shoulder', bones: ['clavicle'], axis: 'x' } },
      {
        key: 'clavicleRetraction',
        target: { armature: 'shoulder', bones: ['clavicle'], axis: 'z' },
      },
      // THORACIC PARTICIPATION (>150 deg). Kapandji's phase 3: the shoulder
      // complex is near its ceiling, so the last stretch to a true vertical is
      // finished by the raquis leaning contralaterally. Restored after being
      // dropped for tearing the neck.
      //
      // The old note blamed "the head, rigid on vert_C1, staying put" — that
      // diagnosis was wrong. vert_C1 IS a descendant of the thoracic block, so
      // the neck and head do ride the lean (measured: the skull travels 15.7 cm).
      // The real tear was between the NECK skin and the DELTOID skin — the neck
      // rides the spine, but the deltoid hangs off the Shoulder armature, which
      // is a separate scene-root skin and stayed behind: 7.5 cm of separation.
      // RigModel now calls carryShouldersWithSpine() whenever a chain leans the
      // trunk, exactly as it already did for spine movements, so the arms follow
      // the upper thorax and the seam holds.
      {
        key: 'thoracic',
        target: { armature: 'spine', bones: [...SHOULDER_THORACIC_LEAN], axis: 'z' },
      },
      // The lumbar half of the same lean. Listed separately because it carries a
      // BIGGER per-level angle than the thoracic one, not because it is a
      // different movement: the raquis bends as one curve, and leaving the lumbar
      // levels out is what made the trunk look like a board on a hinge.
      {
        key: 'lumbar',
        target: { armature: 'spine', bones: [...SHOULDER_LUMBAR_LEAN], axis: 'z' },
      },
    ],
    aimPlane: 'z', // abduction is measured in the frontal plane
  },
  // Sagittal elevation is ALSO scapulohumeral (~2:1), like abduction: the scapula
  // upwardly rotates and the humerus externally rotates past 90 deg. Reuses the
  // SAME chain decomposition (shoulderChain is plane-agnostic in MAGNITUDE); the
  // only difference from abduction is that the humerus's own rotation lands on
  // local X (sagittal flexion) instead of Z (frontal abduction). Making flexion a
  // chain (a) drives the scapula so its upward rotation is VISIBLE during flexion
  // and (b) lets the RhythmReadout show the humero-escapular split for flexion (it
  // gates on kind === 'chain'). The negative arc (extension, to -60) is a pure GH
  // sweep -- scapula/ER are 0 there -- so it behaves exactly as the old joint did.
  //
  // The old needsVisualCheck asked whether the scapula gain, calibrated in the
  // frontal plane, let the sagittal arm reach a clean vertical without drifting
  // out of plane. Both halves are now MEASURED rather than eyeballed, on both
  // sides, by `npx tsx scripts/sweep-shoulder-arc.mts glenohumeral-flexion [left]`:
  // the arm lands on the asked angle to 0.0 deg, and lateral reach holds at its
  // rest value through the arc, so it does not drift out of plane. The gain did
  // NOT need tuning -- what the flexion needed was the aim below.
  'glenohumeral-flexion': {
    kind: 'chain',
    clinicalRange: { min: 0, max: 180 },
    decompose: (deg, side, mod) => {
      const p = shoulderChain(deg, side, mod);
      // shoulderChain signs the GH rotation for the ABDUCTION axis (local Z:
      // R:-1, L:+1). Recover the unsigned magnitude and re-sign it for the
      // FLEXION axis (local X: -1 both sides, matching the old joint mapping).
      const abdSideSign = side === 'R' ? -1 : 1;
      const ghMag = p.glenohumeralRot * abdSideSign; // >=0 in flexion, <0 in extension
      const flexSign = -1; // -X on both sides
      const erSign = side === 'R' ? -1 : 1; // matches glenohumeral-external-rotation
      return {
        humerus: ghMag * flexSign, // local-X (sagittal flexion / extension)
        humeralER: p.humeralExtRot * erSign, // local-Y (obligatory ER past 90 deg)
        scapula: p.scapulaUpwardRot, // local-X (AC share, + both sides)
        // Same sternoclavicular split as abduction: sagittal elevation raises the
        // girdle on its clavicle exactly as frontal elevation does.
        clavicle: p.clavicleElevation,
        clavicleRetraction: p.clavicleRetraction * (side === 'R' ? 1 : -1),
        scapulaTotal: p.scapulothoracicUpwardRot, // wrap input, not a rig target
      };
    },
    targets: [
      { key: 'humerus', target: { armature: 'shoulder', bones: ['humerus_gh'], axis: 'x' } },
      { key: 'humeralER', target: { armature: 'shoulder', bones: ['humerus_gh'], axis: 'y' } },
      { key: 'scapula', target: { armature: 'shoulder', bones: ['scapula'], axis: 'x' } },
      { key: 'clavicle', target: { armature: 'shoulder', bones: ['clavicle'], axis: 'x' } },
      {
        key: 'clavicleRetraction',
        target: { armature: 'shoulder', bones: ['clavicle'], axis: 'z' },
      },
      // No thoracic lean here: the trunk's contribution to a SAGITTAL elevation
      // is extension, not the contralateral side-bend abduction borrows. Adding
      // the frontal lean to flexion would tip the body out of plane.
    ],
    // The shortfall is far worse than in abduction (measured -53 deg at 180,
    // against -9.7): scapular upward rotation is driven on the blade's local X,
    // which lifts the arm in the FRONTAL plane, so during flexion its share of
    // the elevation is largely spent out of plane and never reaches the hand.
    // Aiming closes it; the scapula still rotates, so the rhythm stays visible.
    aimPlane: 'x', // flexion is measured in the sagittal plane
  },
  // THE ROTATIONS ARE EXAMINED WITH THE ELBOW AT 90 DEG. shoulderRom.ts already
  // teaches exactly that ("evaluada con el codo flexionado a 90° y pegado al
  // cuerpo") -- the rig just never did it, so the lab taught one thing in the text
  // and showed another in 3D. With the elbow straight the humerus turns about its
  // own long axis and NOTHING moves on screen: measured, the shaft's twist tracks
  // the asked angle to 0.0 deg while the arm looks identical at 0 and at 40. A
  // physio reviewing it wrote "Rot int y ext mal". The kinematics were never
  // wrong; the position was.
  //
  // With the forearm held at 90 deg it becomes the pointer, exactly as it is for a
  // goniometer, and the range reads off the screen.
  // SIGNS WERE SWAPPED. With the elbow at 90 the direction is finally readable,
  // and measured on the rig (forearm elbow->wrist vector, both sides) the old
  // signs drove the hand the wrong way: "external" rotation carried it ACROSS the
  // belly (lateral component -0.87 at 80 deg) and "internal" carried it OUT to the
  // side (+0.92 at 70). Flipped here. The error survived this long precisely
  // because the straight-elbow pose made it invisible.
  'glenohumeral-external-rotation': {
    kind: 'joint',
    armatureBase: 'Shoulder_Armature',
    bone: 'humerus_gh',
    axis: 'y',
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 80 },
    posture: [ELBOW_AT_90],
  },
  'glenohumeral-internal-rotation': {
    kind: 'joint',
    armatureBase: 'Shoulder_Armature',
    bone: 'humerus_gh',
    axis: 'y',
    sign: { R: 1, L: -1 },
    // RANGE = 70, NOT the 100 deg of the ROM table. 100 deg is the range with the
    // hand travelling BEHIND the back, where the trunk stops limiting -- which is
    // what shoulderRom's own overview says. In THIS position (elbow at 90, arm at
    // the side) the forearm reaches the belly and the trunk blocks it at ~70 deg;
    // driving to 100 sweeps the forearm straight through the abdomen. The larger
    // true range stays taught in shoulderRom.ts.
    clinicalRange: { min: 0, max: 70 },
    posture: [ELBOW_AT_90],
  },

  // --- ELBOW (forearm_flex flexion; forearm_rot pronosupination)
  'elbow-flexion': {
    kind: 'joint',
    armatureBase: 'Shoulder_Armature',
    bone: 'forearm_flex',
    axis: 'x',
    sign: { R: 1, L: -1 },
    clinicalRange: { min: 0, max: 145 },
  },
  'elbow-extension': {
    kind: 'joint',
    armatureBase: 'Shoulder_Armature',
    bone: 'forearm_flex',
    axis: 'x',
    // SAME sign as flexion on purpose: at the elbow, 0 deg is the fully EXTENDED
    // (straight) arm and the max is full flexion -- extension and flexion share
    // one physical arc. Extension is the RETURN toward 0 (shown with the
    // extensor muscles and started from the flexed end), NOT a rotation the
    // opposite way past 0, which would drive an inhuman backward hyperextension.
    sign: { R: 1, L: -1 },
    clinicalRange: { min: 0, max: 145 },
    // Starts bent and straightens: that IS the movement being named.
    arcFrom: 'max',
  },
  'elbow-pronation': {
    kind: 'joint',
    armatureBase: 'Shoulder_Armature',
    bone: 'forearm_rot',
    axis: 'y',
    sign: { R: 1, L: -1 },
    clinicalRange: { min: 0, max: 85 },
  },
  'elbow-supination': {
    kind: 'joint',
    armatureBase: 'Shoulder_Armature',
    bone: 'forearm_rot',
    axis: 'y',
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 90 },
  },

  // --- WRIST (hand_flex, the child of forearm_rot, so it follows pronosupination)
  // The bone was in the rig from the start and never mapped, which is why the C6
  // myotome -- wrist extension, the ASIA key movement for that root -- could only
  // be described in prose and never shown.
  //
  // AXES MEASURED on the shipped GLB, not assumed. Local X is the sagittal hinge
  // and local Z the radial/ulnar one. The direction was resolved from the model's
  // OWN anatomy rather than guessed: the palmar structures (flexor retinaculum,
  // thenar, hypothenar) sit at hand-local z = +1.8 cm and the dorsal ones at 0,
  // so the palm faces local +Z; rotating +40 deg on X carries the fingertips 5 cm
  // toward the dorsum, which is extension. Unsigned between sides -- unlike the
  // deviations, the sagittal hinge comes out the same way on both hands.
  'wrist-extension': {
    kind: 'joint',
    armatureBase: 'Shoulder_Armature',
    bone: 'hand_flex',
    axis: 'x',
    sign: { R: 1, L: 1 },
    clinicalRange: { min: 0, max: 70 },
  },
  'wrist-flexion': {
    kind: 'joint',
    armatureBase: 'Shoulder_Armature',
    bone: 'hand_flex',
    axis: 'x',
    sign: { R: -1, L: -1 },
    clinicalRange: { min: 0, max: 80 },
  },

  // --- KNEE (shin_flex flexion; patella couples)
  // RANGE = 105 deg, NOT the 120-140 deg clinical maximum -- a MESH limit, not a
  // biomechanical one. The rig folds the calf as a RIGID block about the knee with
  // no soft-tissue compression, so past ~110 deg the calf/gastrocnemius mesh drives
  // THROUGH the thigh (measured offline on the GLB: deep interpenetration is ~0 up
  // to 105 deg, then climbs -- 0.5% of calf verts >3 cm inside the thigh at 120 deg,
  // 2.3% at 140 deg). 105 deg is where this figure's calf first meets its thigh, so
  // it reads as a real deep-flexion pose that stops at soft-tissue apposition rather
  // than clipping. The TRUE active ROM (~120 deg hip-extended, ~140 deg hip-flexed,
  // ~160 deg passive heel-to-buttock; Kapandji/Neumann) is taught in kneeRom.ts.
  // knee-extension shares this arc and starts at its flexed extreme, so it too opens
  // on the clean 105 deg pose instead of an over-folded, clipping one.
  'knee-flexion': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'shin_flex',
    axis: 'x',
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 105 },
    couplings: [patellarGlide],
  },
  'knee-extension': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'shin_flex',
    axis: 'x',
    // SAME sign as flexion on purpose: 0 deg is the fully EXTENDED (straight)
    // knee and the max is full flexion -- one physical arc. Extension is the
    // RETURN toward 0 (shown with the quadriceps and started from the flexed
    // end), NOT a rotation past 0, which would kick the shin up into an
    // impossible forward hyperextension.
    // Max 105 deg, matching knee-flexion (a MESH-clipping limit, not a clinical
    // one): extension starts at that clean flexed pose where the calf just meets
    // the thigh, not an over-folded angle where the calf mesh clips through it.
    // See knee-flexion for the offline interpenetration measurements.
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 105 },
    couplings: [patellarGlide],
    // Starts bent and straightens, like elbow extension.
    arcFrom: 'max',
  },
  // Tibial rotation: twist the shin bone about its LONG axis (shin_flex local Y
  // is the tibial long axis, verified from the rig; local X is the knee-flexion
  // axis). This rolls the shin + foot (foot_flex is its child) about the tibia,
  // carrying the foot -- the same "isolate the axis" convention used for forearm
  // pronation (shown with the knee straight; clinically it is assessed at 90 deg
  // of flexion, per the ROM overview). Signs visually calibrated in the lab:
  // internal turns the foot medially (popliteus), external laterally (biceps
  // femoris).
  'knee-internal-rotation': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'shin_flex',
    axis: 'y',
    sign: { R: 1, L: -1 },
    clinicalRange: { min: 0, max: 30 },
  },
  'knee-external-rotation': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'shin_flex',
    axis: 'y',
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 40 },
  },

  // --- HIP (femur_base is the coxofemoral driver, the ROOT of Leg_Armature and
  // the PARENT of shin_flex/patella, so hip motion carries the whole leg). The
  // femur points hip -> knee (distally down), sharing shin_flex's local frame:
  //   x = sagittal (flexion/extension), z = frontal (abduction/adduction),
  //   y = longitudinal (internal/external rotation).
  // SIGNS are the physiological best-guess mirrored off the knee (same armature,
  // same axis convention) and flagged needsVisualCheck: the KINEMATICS (axis +
  // range) are correct; only the +/- direction is calibrated once in the lab,
  // exactly as the shoulder rotations / lateral flexions were. Ranges follow
  // Kapandji / Neumann active norms.
  'hip-flexion': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'femur_base',
    axis: 'x',
    // Flexion swings the distal femur ANTERIORLY -> opposite local sign to knee
    // flexion (which folds the shin posteriorly on the same axis).
    sign: { R: 1, L: -1 },
    // RANGE = 90, NOT the 120 clinical maximum: the rig raises the WHOLE leg with
    // the knee STRAIGHT (no knee-flexion coupling), so this is a straight-leg
    // raise, limited to ~90 deg by the hamstrings before the pelvis tilts. 120
    // deg is only reachable with the knee flexed; posing the straight rig at 120
    // reads as an inhuman over-kick. The true 120 deg (knee-flexed) is taught in
    // hipRom.ts's overview.
    clinicalRange: { min: 0, max: 90 },
    needsVisualCheck: true,
  },
  'hip-extension': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'femur_base',
    axis: 'x',
    // A REAL movement past neutral (unlike the knee, where extension only
    // returns toward 0): the thigh travels posteriorly, so the sign is the
    // opposite of hip flexion.
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 20 },
    needsVisualCheck: true,
  },
  'hip-abduction': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'femur_base',
    axis: 'z',
    // Frontal plane: distal femur swings AWAY from the midline. Sign visually
    // CALIBRATED: the first guess drove the leg medially (through the stance
    // leg), so it is flipped -> R:-1 / L:+1 abducts outward.
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 45 },
  },
  'hip-adduction': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'femur_base',
    axis: 'z',
    // Toward / across the midline: opposite of (the calibrated) abduction.
    sign: { R: 1, L: -1 },
    // Capped at 20 deg because the rig keeps BOTH legs present with the knee
    // straight. The cap was believed to be enough to keep the limbs apart --
    // "20 deg reads as a real cross-over without deep mesh interpenetration" --
    // and it is not: measured with scripts/measure-limb-collision.mts, the moving
    // thigh went 8.2 cm INTO the stance thigh at 15 deg.
    clinicalRange: { min: 0, max: 20 },
    couplings: [hipCrossOverFlexion],
  },
  'hip-internal-rotation': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'femur_base',
    axis: 'y',
    // Longitudinal roll; mirrors the knee's tibial rotation sign convention.
    sign: { R: 1, L: -1 },
    clinicalRange: { min: 0, max: 40 },
    needsVisualCheck: true,
  },
  'hip-external-rotation': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'femur_base',
    axis: 'y',
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 45 },
    needsVisualCheck: true,
  },

  // --- ANKLE (foot_flex is the talocrural driver, CHILD of shin_flex, so it
  // follows the knee/leg). Dorsi/plantarflexion is the sagittal hinge; inversion
  // /eversion is the subtalar frontal component. Same needsVisualCheck discipline
  // as the hip: axes + ranges are correct, the +/- is calibrated once in the lab.
  'ankle-dorsiflexion': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'foot_flex',
    axis: 'x',
    sign: { R: 1, L: -1 },
    clinicalRange: { min: 0, max: 20 },
    needsVisualCheck: true,
  },
  'ankle-plantarflexion': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'foot_flex',
    axis: 'x',
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 50 },
    needsVisualCheck: true,
  },
  'ankle-inversion': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'foot_flex',
    axis: 'y',
    sign: { R: 1, L: -1 },
    clinicalRange: { min: 0, max: 35 },
    needsVisualCheck: true,
  },
  'ankle-eversion': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'foot_flex',
    axis: 'y',
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 15 },
    needsVisualCheck: true,
  },

  // --- SPINE: regional angle distributed across that region's vertebrae.
  // X+ = anterior flexion; Z = lateral bending; Y = axial rotation.
  'lumbar-flexion': {
    kind: 'spine', armature: 'Spine_Armature', bones: LUMBAR_BONES,
    axis: 'x', sign: 1, clinicalRange: { min: 0, max: 60 },
  },
  'lumbar-extension': {
    kind: 'spine', armature: 'Spine_Armature', bones: LUMBAR_BONES,
    axis: 'x', sign: -1, clinicalRange: { min: 0, max: 35 },
  },
  'lumbar-lateral-flexion': {
    kind: 'spine', armature: 'Spine_Armature', bones: LUMBAR_BONES,
    axis: 'z', sign: 1, clinicalRange: { min: 0, max: 25 },
  },
  'lumbar-rotation': {
    kind: 'spine', armature: 'Spine_Armature', bones: LUMBAR_BONES,
    axis: 'y', sign: 1, clinicalRange: { min: 0, max: 5 },
  },

  'thoracic-flexion': {
    kind: 'spine', armature: 'Spine_Armature', bones: THORACIC_BONES,
    axis: 'x', sign: 1, clinicalRange: { min: 0, max: 45 },
  },
  'thoracic-extension': {
    kind: 'spine', armature: 'Spine_Armature', bones: THORACIC_BONES,
    axis: 'x', sign: -1, clinicalRange: { min: 0, max: 25 },
  },
  'thoracic-lateral-flexion': {
    kind: 'spine', armature: 'Spine_Armature', bones: THORACIC_BONES,
    axis: 'z', sign: 1, clinicalRange: { min: 0, max: 30 },
  },
  'thoracic-rotation': {
    kind: 'spine', armature: 'Spine_Armature', bones: THORACIC_BONES,
    axis: 'y', sign: 1, clinicalRange: { min: 0, max: 35 },
  },

  'cervical-flexion': {
    kind: 'spine', armature: 'Spine_Armature', bones: CERVICAL_BONES,
    axis: 'x', sign: 1, clinicalRange: { min: 0, max: 45 },
  },
  'cervical-extension': {
    kind: 'spine', armature: 'Spine_Armature', bones: CERVICAL_BONES,
    axis: 'x', sign: -1, clinicalRange: { min: 0, max: 70 },
  },
  'cervical-lateral-flexion': {
    kind: 'spine', armature: 'Spine_Armature', bones: CERVICAL_BONES,
    axis: 'z', sign: 1, clinicalRange: { min: 0, max: 45 },
  },
  // ~50% of cervical axial rotation happens at the atlanto-axial joint (C1-C2),
  // not uniformly along the neck (Anatris ROM 3.2: "no animar la rotacion como un
  // giro uniforme"). CERVICAL_BONES runs C7..C1, so the last two entries (C2, C1)
  // carry half the total between them and the head leads the twist.
  'cervical-rotation': {
    kind: 'spine', armature: 'Spine_Armature', bones: CERVICAL_BONES,
    axis: 'y', sign: 1, clinicalRange: { min: 0, max: 80 },
    weights: [0.09, 0.09, 0.1, 0.1, 0.12, 0.25, 0.25],
  },
};

// ---------------------------------------------------------------------------
// Pure helpers (no THREE).
// ---------------------------------------------------------------------------

/** Full unique armature node name for a paired limb, e.g. Shoulder_Armature_R. */
export function resolveArmatureName(base: LimbArmatureBase, side: Side): string {
  return `${base}_${side}`;
}

/** The control for a movementId, or undefined if unmapped. */
export function getBoneControl(movementId: string): BoneControl | undefined {
  return BONE_MAP[movementId];
}

/** True when the movement can actually drive the rig. */
export function isDrivable(movementId: string): boolean {
  const c = BONE_MAP[movementId];
  return !!c && c.kind !== 'unsupported';
}

/**
 * Distribute a regional clinical angle (deg) across a spine block, returning the
 * per-vertebra LOCAL angle in DEGREES (already signed). Uniform unless weights
 * are provided, in which case the angle is split proportionally to the weights.
 */
export function distributeSpineAngle(c: SpineControl, clinicalDeg: number): number[] {
  const n = c.bones.length;
  if (n === 0) return [];
  const signed = clinicalDeg * c.sign;
  if (!c.weights || c.weights.length !== n) {
    return new Array(n).fill(signed / n);
  }
  const total = c.weights.reduce((a, b) => a + b, 0) || 1;
  return c.weights.map((w) => (signed * w) / total);
}
