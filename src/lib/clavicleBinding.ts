// src/lib/clavicleBinding.ts
//
// THE CLAVICLE WAS WELDED TO THE SPINE.
//
// The v11 "skeleton completion" pass bound every loose bone mesh in the GLB to
// its nearest bone. For the ribs and the skull that was right. For the clavicle
// it was not: its nearest bone is a thoracic vertebra, so both clavicle meshes
// ship skinned 100% to `vert_T1`. Measured on the shipped GLB, the clavicle's
// lateral end travels 0.00 cm across the whole 0-150 deg elevation arc.
//
// The consequence is the one a physiotherapist spots immediately: the scapula
// upwardly rotates ~60 deg while the clavicle it hangs from stays bolted to the
// spine, so the acromioclavicular joint pulls apart and the girdle slides through
// itself instead of moving as one piece. The bone the user is being taught about
// -- the strut that holds the shoulder off the chest -- is the one bone in the
// shoulder that cannot move.
//
// This cannot be fixed by re-weighting: the clavicle mesh is skinned to the
// SPINE's skeleton, which contains no `clavicle` bone to re-weight onto. So the
// bone is SPLICED into that skeleton first (the same trick RigModel already uses
// for the forearm twist bone) and the mesh is then rigidly bound to it.
//
// Lives in src/lib rather than inside RigModel so the component and the offline
// harness share ONE implementation and cannot drift apart.

import * as THREE from 'three';

/** Strip the `_12` disambiguator three.js appends to duplicate node names. */
const baseName = (n: string): string => n.replace(/_\d+$/, '');

export interface ClavicleBindResult {
  /** Mesh name -> the armature its clavicle bone came from. */
  bound: { mesh: string; armature: string }[];
  /** Meshes that looked like a clavicle but could not be bound, with the reason. */
  skipped: { mesh: string; reason: string }[];
}

/**
 * Bind each clavicle mesh to the `clavicle` bone of its own side's shoulder
 * armature, so the strut moves with the girdle it belongs to.
 *
 * Safe to call once per loaded scene, before any posing: rest pose is preserved
 * exactly (the spliced bone's inverse is taken from its CURRENT world matrix, so
 * bone * boneInverse is the identity at bind time and nothing jumps).
 */
export function bindClaviclesToShoulderGirdle(scene: THREE.Object3D): ClavicleBindResult {
  const result: ClavicleBindResult = { bound: [], skipped: [] };

  // The clavicle bone of each side, looked up inside its own armature subtree --
  // never globally, because the two sides share the bone NAME.
  const clavicleBone = new Map<'R' | 'L', THREE.Object3D>();
  for (const side of ['R', 'L'] as const) {
    const root = scene.getObjectByName(`Shoulder_Armature_${side}`);
    if (!root) continue;
    root.traverse((o) => {
      if (baseName(o.name) === 'clavicle' && !clavicleBone.has(side)) clavicleBone.set(side, o);
    });
  }
  if (!clavicleBone.size) return result;

  scene.updateMatrixWorld(true);

  const meshes: THREE.SkinnedMesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    // Match the MESH name, not the material: the clavicle's material is the
    // generic bone material shared by the whole skeleton.
    if (m.isMesh && m.isSkinnedMesh && /^clavicle/i.test(baseName(m.name))) meshes.push(m);
  });

  for (const mesh of meshes) {
    const geom = mesh.geometry;
    if (!geom.boundingSphere) geom.computeBoundingSphere();
    const centre = geom.boundingSphere!.center.clone().applyMatrix4(mesh.matrixWorld);
    // +X is the model's right. A clavicle sitting on the midline would be a
    // different bone entirely, so treat 0 as unusable rather than guessing.
    if (Math.abs(centre.x) < 1e-4) {
      result.skipped.push({ mesh: mesh.name, reason: 'sin lado (centrada en X)' });
      continue;
    }
    const side: 'R' | 'L' = centre.x > 0 ? 'R' : 'L';
    const bone = clavicleBone.get(side);
    if (!bone) {
      result.skipped.push({ mesh: mesh.name, reason: `sin armature de hombro ${side}` });
      continue;
    }
    const skeleton = mesh.skeleton;
    const si = geom.getAttribute('skinIndex');
    const sw = geom.getAttribute('skinWeight');
    if (!skeleton || !si || !sw) {
      result.skipped.push({ mesh: mesh.name, reason: 'sin esqueleto o sin pesos' });
      continue;
    }

    // Splice the bone in if this skeleton has never seen it. Bone INDICES are
    // appended, so any skinIndex already stored stays valid.
    let index = skeleton.bones.indexOf(bone as THREE.Bone);
    if (index < 0) {
      skeleton.bones.push(bone as THREE.Bone);
      skeleton.boneInverses.push(new THREE.Matrix4().copy(bone.matrixWorld).invert());
      skeleton.init();
      index = skeleton.bones.length - 1;
    }

    for (let i = 0; i < si.count; i++) {
      si.setXYZW(i, index, 0, 0, 0);
      sw.setXYZW(i, 1, 0, 0, 0);
    }
    si.needsUpdate = true;
    sw.needsUpdate = true;
    result.bound.push({ mesh: mesh.name, armature: `Shoulder_Armature_${side}` });
  }

  return result;
}
