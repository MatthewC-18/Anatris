// scripts/lib/rigPose.mts
//
// Drives the shipped GLB into a clinical pose on the CPU, exactly as the app's
// RigModel does in the browser.
//
// The pose comes straight from boneMap's control -- the same `decompose` and
// `targets` the runtime uses -- so a harness script cannot drift out of sync with
// the app the way a hand-copied chain would. Only the parts RigModel adds AROUND
// the chain live here, and each is marked:
//
//   - scapulothoracic wrap: the blade slides on the ribcage instead of hinging in
//     mid-air, and the humerus is counter-rotated so the wrap does not drag it.
//   - shoulder carry: when a chain leans the trunk, both shoulder armatures ride
//     the upper thorax, or the neck skin and the deltoid skin tear apart.
//   - aim: a small residual correction that lands the shaft on exactly the asked
//     clinical angle after the chain has run.
//   - lats follow: the latissimus helper bones ride the humeral head.
//
// Extracted from sweep-shoulder-arc.mts so the POSED RENDERER shows the same pose
// the sweep measures.

import * as THREE from 'three';
import { getBoneControl, resolveArmatureName, type BoneControl } from '../../src/lib/boneMap.ts';
import { bindClaviclesToShoulderGirdle } from '../../src/lib/clavicleBinding.ts';
import { repairFaceWinding } from '../../src/lib/faceWinding.ts';
import { bridgeShoulderSkin } from '../../src/lib/shoulderSkinBridge.ts';
import { gradeShoulderMuscleBinding } from '../../src/lib/shoulderMuscleBinding.ts';
import { relaxSkinSeams } from '../../src/lib/skinSeamRelax.ts';
import { SCAPULA_WRAP_SIGN, scapulaWrap } from '../../src/lib/biomech/scapulaWrap.ts';

const D2R = Math.PI / 180;

export type Side = 'R' | 'L';

const LATS_ROT_FOLLOW = 0.18;
const LATS_ROT_MAX_DEG = 28;
/** Cosmetic forward lift that keeps the resting arm off the flank. */
export const ARM_CLEARANCE_DEG = 35;
export const ARM_CLEARANCE_FADE_DEG = 75;

const AX: Record<string, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

/** Strip the `_12` disambiguator three.js appends to duplicate node names. */
export const baseName = (n: string) => n.replace(/_\d+$/, '');

export interface PoseOptions {
  /** Add the cosmetic forward lift. Off by default: it is not part of the
   *  clinical angle and would be misread as extra elevation. */
  withClearance?: boolean;
  /** Apply the residual aim. On by default (the runtime always aims). */
  aim?: boolean;
  /** Apply the scapulothoracic wrap. On by default; the wrap SOLVER turns it off
   *  so it can search for the companion rotations from scratch. */
  wrap?: boolean;
  /** Override the wrap companions (deg), instead of reading the table. For the
   *  solver, which is searching exactly these two numbers. */
  wrapOverride?: readonly [number, number];
}

export interface RigPoser {
  control: BoneControl;
  /** True for a multi-bone chain (elevation), false for a single-bone joint. */
  isChain: boolean;
  side: Side;
  /** Bones of the driven shoulder armature, by base name. */
  shoulderBones: Map<string, THREE.Object3D>;
  spineBones: Map<string, THREE.Object3D>;
  /** Rest world matrices, by object. */
  restWorld: Map<THREE.Object3D, THREE.Matrix4>;
  /** Drive the whole scene into the pose for this clinical angle. */
  pose: (deg: number, opts?: PoseOptions) => void;
  /** The chain's named radian outputs at an angle (empty for a joint). */
  outputsAt: (deg: number) => Record<string, number>;
}

/**
 * Build a poser for one movement on one side.
 * @param apply mirror the runtime's extras (wrap / carry / aim / lats). Off shows
 *              the raw GLB behaviour.
 */
export function createRigPoser(
  scene: THREE.Object3D,
  movementId: string,
  side: Side = 'R',
  apply = true,
): RigPoser {
  const control = getBoneControl(movementId);
  if (!control || (control.kind !== 'chain' && control.kind !== 'joint')) {
    throw new Error(`${movementId} no es accionable (es ${control?.kind ?? 'nada'})`);
  }
  const isChain = control.kind === 'chain';

  scene.updateMatrixWorld(true);
  // Mesh repair the app does at load. Must run BEFORE the rest pose is captured,
  // or the harness measures a rig the user never sees.
  repairFaceWinding(scene);
  bindClaviclesToShoulderGirdle(scene);
  bridgeShoulderSkin(scene);
  gradeShoulderMuscleBinding(scene);
  relaxSkinSeams(scene);
  scene.updateMatrixWorld(true);

  const byArm = new Map<string, Map<string, THREE.Object3D>>();
  for (const an of ['Shoulder_Armature_R', 'Shoulder_Armature_L', 'Spine_Armature']) {
    const root = scene.getObjectByName(an);
    if (!root) continue;
    const m = new Map<string, THREE.Object3D>();
    root.traverse((o) => { if (!m.has(baseName(o.name))) m.set(baseName(o.name), o); });
    byArm.set(an, m);
  }

  const restQuat = new Map<THREE.Object3D, THREE.Quaternion>();
  const restPos = new Map<THREE.Object3D, THREE.Vector3>();
  const restScale = new Map<THREE.Object3D, THREE.Vector3>();
  const restWorld = new Map<THREE.Object3D, THREE.Matrix4>();
  scene.traverse((o) => {
    restQuat.set(o, o.quaternion.clone());
    restPos.set(o, o.position.clone());
    restScale.set(o, o.scale.clone());
    restWorld.set(o, o.matrixWorld.clone());
  });

  const shoulderBones = byArm.get(resolveArmatureName('Shoulder_Armature', side))!;
  const spineBones = byArm.get('Spine_Armature')!;
  const hum = shoulderBones.get('humerus_gh')!;
  const scap = shoulderBones.get('scapula')!;
  const elbow = shoulderBones.get('forearm_flex')!;
  const wrapSign = SCAPULA_WRAP_SIGN[side];

  // --- shoulder carry (RigModel) ---
  function carryShoulders() {
    const anchor = spineBones.get('vert_T3');
    const anchorRest = anchor ? restWorld.get(anchor) : undefined;
    if (!anchor || !anchorRest) return;
    const delta = new THREE.Matrix4().copy(anchor.matrixWorld)
      .multiply(new THREE.Matrix4().copy(anchorRest).invert());
    for (const s of ['R', 'L'] as const) {
      const root = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', s));
      const rootRest = root ? restWorld.get(root) : undefined;
      if (!root || !rootRest) continue;
      const target = new THREE.Matrix4().copy(delta).multiply(rootRest);
      const local = root.parent
        ? new THREE.Matrix4().copy(root.parent.matrixWorld).invert().multiply(target)
        : target;
      local.decompose(root.position, root.quaternion, root.scale);
    }
    scene.updateMatrixWorld(true);
  }

  // --- lats follow (RigModel) ---
  function driveLats() {
    for (const [hn, an] of [
      ['latshum_l', 'Shoulder_Armature_R'],
      ['latshum_r', 'Shoulder_Armature_L'],
    ] as const) {
      const helper = spineBones.get(hn);
      const h = byArm.get(an)?.get('humerus_gh');
      if (!helper || !h || !helper.parent) continue;
      const hR = restWorld.get(h), heR = restWorld.get(helper);
      const qh = h.getWorldQuaternion(new THREE.Quaternion());
      const qp = helper.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      if (hR && heR) {
        const s = new THREE.Vector3(), t = new THREE.Vector3();
        const qhr = new THREE.Quaternion(), qer = new THREE.Quaternion();
        hR.decompose(t, qhr, s); heR.decompose(t, qer, s);
        const qd = qh.clone().multiply(qhr.invert());
        const a = 2 * Math.acos(Math.min(1, Math.abs(qd.w)));
        const sh = a > 1e-4 ? Math.min(LATS_ROT_FOLLOW, (LATS_ROT_MAX_DEG * D2R) / a) : LATS_ROT_FOLLOW;
        qd.slerpQuaternions(new THREE.Quaternion(), qd, sh);
        helper.quaternion.copy(qp).multiply(qd).multiply(qer);
      }
      const pw = h.getWorldPosition(new THREE.Vector3());
      helper.parent.worldToLocal(pw);
      helper.position.copy(pw);
    }
    scene.updateMatrixWorld(true);
  }

  const outputsAt = (deg: number): Record<string, number> =>
    isChain ? (control as any).decompose(deg, side) : {};

  function pose(
    deg: number,
    { withClearance = false, aim = true, wrap = true, wrapOverride }: PoseOptions = {},
  ) {
    scene.traverse((o) => {
      const q = restQuat.get(o); if (q) o.quaternion.copy(q);
      const p = restPos.get(o); if (p) o.position.copy(p);
      const s = restScale.get(o); if (s) o.scale.copy(s);
    });
    // --- EXAMINATION POSTURE (RigModel): held at every angle, 0 included ---
    if (!isChain && (control as any).posture) {
      for (const p of (control as any).posture) {
        const pb = shoulderBones.get(p.bone);
        if (!pb) continue;
        pb.quaternion.copy(restQuat.get(pb)!);
        pb.rotateOnAxis(AX[p.axis], p.sign[side] * p.deg * D2R);
      }
      scene.updateMatrixWorld(true);
    }
    if (deg !== 0 && !isChain) {
      // --- a plain JOINT: one bone, one local axis, per-side sign ---
      const j = control as any;
      const bone = shoulderBones.get(j.bone);
      if (bone) {
        bone.quaternion.copy(restQuat.get(bone)!);
        bone.rotateOnAxis(AX[j.axis], deg * D2R * j.sign[side]);
      }
      scene.updateMatrixWorld(true);
    } else if (deg !== 0) {
      // --- boneMap's chain, applied exactly as RigModel does ---
      const outputs = outputsAt(deg);
      const seen = new Set<THREE.Object3D>();
      for (const { key, target } of (control as any).targets) {
        const rad = outputs[key];
        if (rad === undefined) continue;
        const map = target.armature === 'spine' ? spineBones : shoulderBones;
        for (const bn of target.bones) {
          const bone = map.get(bn);
          if (!bone) continue;
          if (!seen.has(bone)) { bone.quaternion.copy(restQuat.get(bone)!); seen.add(bone); }
          bone.rotateOnAxis(AX[target.axis], rad);
        }
      }
      scene.updateMatrixWorld(true);
      if (apply) {
        // --- scapulothoracic wrap (keyed on the SCAPULOTHORACIC total, not the
        // acromioclavicular share; see RigModel) ---
        const upRad = outputs.scapulaTotal ?? outputs.scapula;
        if (upRad && wrap) {
          const before = scap.getWorldQuaternion(new THREE.Quaternion());
          const [wy, wz] = wrapOverride ?? scapulaWrap(upRad / D2R);
          scap.rotateOnAxis(AX.y, wrapSign * wy * D2R);
          scap.rotateOnAxis(AX.z, wrapSign * wz * D2R);
          scene.updateMatrixWorld(true);
          const after = scap.getWorldQuaternion(new THREE.Quaternion());
          hum.quaternion.premultiply(after.invert().multiply(before));
          scene.updateMatrixWorld(true);
        }
        // --- shoulder carry, when the chain leans the trunk ---
        if (outputs.thoracic) carryShoulders();
        // --- aim ---
        const plane = (control as any).aimPlane as 'x' | 'z' | undefined;
        if (aim && plane) {
          const rh = new THREE.Vector3().setFromMatrixPosition(restWorld.get(hum)!);
          const re = new THREE.Vector3().setFromMatrixPosition(restWorld.get(elbow)!);
          const want = re.sub(rh).normalize();
          if (plane === 'z') {
            const r = Math.hypot(want.x, want.y);
            const a = Math.atan2(want.x, -want.y) + deg * D2R * (side === 'R' ? 1 : -1);
            want.set(Math.sin(a) * r, -Math.cos(a) * r, want.z).normalize();
            // Cross-body adduction is carried in FRONT of the trunk; same swing
            // the app's aim applies, so the harness poses the arm the user sees.
            const cross = outputs.crossBodyFlex;
            if (cross) {
              const rz = Math.hypot(want.z, want.y);
              const az = Math.atan2(want.z, -want.y) + cross;
              want.set(want.x, -Math.cos(az) * rz, Math.sin(az) * rz).normalize();
            }
          } else {
            const r = Math.hypot(want.z, want.y);
            const a = Math.atan2(want.z, -want.y) + deg * D2R;
            want.set(want.x, -Math.cos(a) * r, Math.sin(a) * r).normalize();
          }
          const ph = hum.getWorldPosition(new THREE.Vector3());
          const pe = elbow.getWorldPosition(new THREE.Vector3());
          const have = pe.sub(ph).normalize();
          const fix = new THREE.Quaternion().setFromUnitVectors(have, want);
          const pw = hum.parent
            ? hum.parent.getWorldQuaternion(new THREE.Quaternion())
            : new THREE.Quaternion();
          hum.quaternion.premultiply(pw.clone().invert().multiply(fix).multiply(pw));
          scene.updateMatrixWorld(true);
        }
      }
    }
    if (withClearance) {
      const f = Math.max(0, Math.min(1, (ARM_CLEARANCE_FADE_DEG - deg) / ARM_CLEARANCE_FADE_DEG));
      if (f > 0) hum.rotateOnAxis(AX.x, -ARM_CLEARANCE_DEG * f * D2R);
    }
    scene.updateMatrixWorld(true);
    if (apply) driveLats();
  }

  return {
    control, isChain, side, shoulderBones, spineBones, restWorld, pose, outputsAt,
  };
}
