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

import { shoulderChain } from './biomech/shoulderChain';

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
  decompose: (clinicalDeg: number, side: Side) => Record<string, number>;
  targets: { key: string; target: ChainTarget }[];
  clinicalRange: { min: number; max: number };
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

/** Patellar glide: patella tracks the knee. patella.x = shin_flex.x * 0.5 */
const patellarGlide: BoneCoupling = {
  bone: 'patella',
  axis: 'x',
  follow: (primaryRad) => primaryRad * 0.5,
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

// Thoracic vertebrae that take the contralateral lean during high shoulder
// elevation (>150 deg), head-ward. Each receives the SAME per-level angle that
// shoulderChain returns (thoracicLatFlexPerVert). Must match shoulderChain's own
// SPINE_VERTS list.
// (A prior GLB mis-skin -- Vertebra_T10/T11/T12 weighted to vert_T1 -- made any
// upper-thoracic rotation drag those vertebrae out of place; that was re-skinned
// in copia_fisio.blend and cuerpo-rig.glb was re-exported, so the lean is safe.)
const ABDUCTION_THORACIC = ['vert_T6', 'vert_T5', 'vert_T4', 'vert_T3', 'vert_T2'];

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
  // SHOULDER_CHAIN_VERIFIED is still false: keep needsVisualCheck on.
  'glenohumeral-abduction': {
    kind: 'chain',
    clinicalRange: { min: 0, max: 180 },
    needsVisualCheck: true,
    decompose: (deg, side) => {
      const p = shoulderChain(deg, side);
      // External rotation sign matches glenohumeral-external-rotation below
      // (R: +1, L: -1). shoulderChain returns it unsigned.
      const erSign = side === 'R' ? 1 : -1;
      return {
        humerus: p.glenohumeralRot,        // local-Z, already signed per side
        humeralER: p.humeralExtRot * erSign, // local-Y
        scapula: p.scapulaUpwardRot,        // local-X (positive both sides)
        thoracic: p.thoracicLatFlexPerVert, // local-Z, already signed per side
      };
    },
    targets: [
      { key: 'humerus', target: { armature: 'shoulder', bones: ['humerus_gh'], axis: 'z' } },
      { key: 'humeralER', target: { armature: 'shoulder', bones: ['humerus_gh'], axis: 'y' } },
      { key: 'scapula', target: { armature: 'shoulder', bones: ['scapula'], axis: 'x' } },
      { key: 'thoracic', target: { armature: 'spine', bones: ABDUCTION_THORACIC, axis: 'z' } },
    ],
  },
  'glenohumeral-flexion': {
    kind: 'joint',
    armatureBase: 'Shoulder_Armature',
    bone: 'humerus_gh',
    axis: 'x',
    // Flexion is -X on both sides per the handoff table.
    sign: { R: -1, L: -1 },
    clinicalRange: { min: 0, max: 180 },
  },
  'glenohumeral-external-rotation': {
    kind: 'joint',
    armatureBase: 'Shoulder_Armature',
    bone: 'humerus_gh',
    axis: 'y',
    sign: { R: 1, L: -1 },
    clinicalRange: { min: 0, max: 80 },
    needsVisualCheck: true,
  },
  'glenohumeral-internal-rotation': {
    kind: 'joint',
    armatureBase: 'Shoulder_Armature',
    bone: 'humerus_gh',
    axis: 'y',
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 100 },
    needsVisualCheck: true,
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
    // Opposite of flexion about the same axis.
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 145 },
  },
  'elbow-pronation': {
    kind: 'joint',
    armatureBase: 'Shoulder_Armature',
    bone: 'forearm_rot',
    axis: 'y',
    sign: { R: 1, L: -1 },
    clinicalRange: { min: 0, max: 85 },
    needsVisualCheck: true,
  },
  'elbow-supination': {
    kind: 'joint',
    armatureBase: 'Shoulder_Armature',
    bone: 'forearm_rot',
    axis: 'y',
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 90 },
    needsVisualCheck: true,
  },

  // --- KNEE (shin_flex flexion; patella couples)
  'knee-flexion': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'shin_flex',
    axis: 'x',
    sign: { R: -1, L: 1 },
    clinicalRange: { min: 0, max: 140 },
    couplings: [patellarGlide],
  },
  'knee-extension': {
    kind: 'joint',
    armatureBase: 'Leg_Armature',
    bone: 'shin_flex',
    axis: 'x',
    sign: { R: 1, L: -1 },
    clinicalRange: { min: 0, max: 140 },
    couplings: [patellarGlide],
  },
  // The rig has no dedicated tibial-rotation bone (Leg_Armature stops at
  // shin_flex/foot_flex), so axial tibial rotation cannot be reproduced.
  'knee-internal-rotation': {
    kind: 'unsupported',
    reason:
      'La rotacion tibial no esta riggeada en este modelo (la pierna llega hasta flexion de rodilla y tobillo).',
  },
  'knee-external-rotation': {
    kind: 'unsupported',
    reason:
      'La rotacion tibial no esta riggeada en este modelo (la pierna llega hasta flexion de rodilla y tobillo).',
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
    axis: 'z', sign: 1, clinicalRange: { min: 0, max: 25 }, needsVisualCheck: true,
  },
  'lumbar-rotation': {
    kind: 'spine', armature: 'Spine_Armature', bones: LUMBAR_BONES,
    axis: 'y', sign: 1, clinicalRange: { min: 0, max: 5 }, needsVisualCheck: true,
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
    axis: 'z', sign: 1, clinicalRange: { min: 0, max: 30 }, needsVisualCheck: true,
  },
  'thoracic-rotation': {
    kind: 'spine', armature: 'Spine_Armature', bones: THORACIC_BONES,
    axis: 'y', sign: 1, clinicalRange: { min: 0, max: 35 }, needsVisualCheck: true,
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
    axis: 'z', sign: 1, clinicalRange: { min: 0, max: 45 }, needsVisualCheck: true,
  },
  'cervical-rotation': {
    kind: 'spine', armature: 'Spine_Armature', bones: CERVICAL_BONES,
    axis: 'y', sign: 1, clinicalRange: { min: 0, max: 80 }, needsVisualCheck: true,
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
