// Skin repairs the GLB cannot carry, applied once at load.
//
// These live outside RigModel so the offline renderers can apply the SAME
// repair the app does. Reviewing a movement from `scripts/render-pose.mts` is
// only worth anything if what it draws is what ships; a repair that exists only
// inside the React component makes every offline frame a lie.
//
// Rest-pose safety is the rule for everything here: weights must sum to 1, and
// every bone matrix is identity at bind, so the neutral pose stays
// pixel-identical and only the posed frames change.

import * as THREE from 'three';

const _v = new THREE.Vector3();

/** Half-height of the band over which knee skin hands off thigh -> leg. */
export const KNEE_SKIN_BAND_M = 0.06;

/** Skin whose centre is this close to the knee is joint skin, and gets blended. */
export const KNEE_SKIN_REACH_M = 0.14;

/**
 * THE KNEE TORE OPEN FROM 45 DEG OF FLEXION.
 *
 * A rectangular block detached off the joint and the thigh ended in a flat,
 * open cross-section -- in every knee demo, every knee orthopedic test, and,
 * once hip flexion learned to fold the knee past 90 deg, in the hip too.
 *
 * The cause is not a mis-bound mesh: no leg mesh is attached to the wrong bone.
 * It is that Z-Anatomy builds the knee's surface out of separate REGION
 * patches, each welded RIGIDLY to one bone, with no blend between them:
 *
 *   Anterior_region_of_knee x3 (155 vertices) -> patella
 *   Posterior_region_of_knee x4 (146)         -> shin_flex
 *   Popliteal_fossa x4 (42)                   -> femur_base
 *
 * The patella is the one that shows. It is a sesamoid that GLIDES, and the rig
 * drives it at half the knee angle (patellarGlide), so at 90 deg of flexion the
 * largest patch of skin on the front of the knee swings away on its own by
 * 45 deg -- the detached block -- while its neighbours stay with the thigh and
 * the shin. Three rigid patches, on three bones that move by three different
 * amounts, cannot stay joined.
 *
 * Real skin over the knee is one sheet: anchored to the thigh above, to the leg
 * below, stretched across the joint in between. So weight it that way, by rest
 * height across a band centred on the knee. Nothing rides the patella any more.
 *
 * This is the leg's version of the elbow repair in RigModel (`UPPER_ARM_Y`):
 * the elbow folds clean to 145 deg because of it, and the knee never got the
 * same treatment.
 *
 * Measured with `scripts/measure-knee-fold.mts`, diagnosed with
 * `scripts/diag-knee-skin-binding.mts`, reviewed with
 * `MOVE=knee-flexion DEG=0,45,90,105 VIEW=side LAYERS=skin scripts/render-pose.mts`.
 *
 * @returns true when the mesh was re-weighted.
 */
export function blendKneeSkin(mesh: THREE.Mesh, kneeY: number): boolean {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  const bn = (b: THREE.Bone) => b.name.replace(/_\d+$/, '');
  const femIdx = sk.skeleton.bones.findIndex((b) => bn(b) === 'femur_base');
  const shinIdx = sk.skeleton.bones.findIndex((b) => bn(b) === 'shin_flex');
  if (femIdx < 0 || shinIdx < 0) return false;
  const pos = mesh.geometry.getAttribute('position');
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  if (!pos || !si || !sw) return false;
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i);
    mesh.localToWorld(_v); // rest world pos (bones = identity at bind)
    // 1 at the top of the band (pure thigh), 0 at the bottom (pure leg).
    let t = (_v.y - (kneeY - KNEE_SKIN_BAND_M)) / (2 * KNEE_SKIN_BAND_M);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = t * t * (3 - 2 * t); // smoothstep, so neither end creases
    si.setXYZW(i, femIdx, shinIdx, 0, 0);
    sw.setXYZW(i, t, 1 - t, 0, 0);
  }
  si.needsUpdate = true;
  sw.needsUpdate = true;
  return true;
}

/** Knee height read off the leg armatures, so a rig re-export cannot move it. */
export function kneeHeight(scene: THREE.Object3D, fallback = 0.452): number {
  let y = Infinity;
  for (const side of ['R', 'L'] as const) {
    scene.getObjectByName(`Leg_Armature_${side}`)?.traverse((o) => {
      if (o.name.replace(/_\d+$/, '') === 'shin_flex') {
        y = Math.min(y, o.getWorldPosition(new THREE.Vector3()).y);
      }
    });
  }
  return isFinite(y) ? y : fallback;
}
