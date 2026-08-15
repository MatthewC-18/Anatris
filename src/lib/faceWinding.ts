// src/lib/faceWinding.ts
//
// HALF THE BODY WAS LIT FROM THE INSIDE.
//
// The right hand and the right foot rendered dark brown against a light-skinned
// left hand and left foot -- same shape, same material instance, same colour,
// same non-zero normals. Nothing about the material could explain it, because
// the material was not the difference: the WINDING was.
//
// Z-Anatomy builds one half of the body and mirrors it, and a mirror reverses
// triangle winding. Measured on the shipped rig, comparing each mesh's own face
// winding against its own shipped vertex normals:
//
//   side    skin    caps    muscle   bone
//   x < 0   100%     100%     98%     99%     winding agrees with the normals
//   x > 0     0%       0%      4%     24%
//
// The materials are DoubleSide, so nothing disappears -- but three.js NEGATES the
// normal on a back-facing fragment, and on that half every camera-facing fragment
// is back-facing. So the shading normal points into the mesh, every light lands
// behind the surface, and what is left is ambient: a flat dark shape.
//
// THE FIX IS THE WINDING, NOT THE NORMALS. The normals are authored, smooth, and
// correct; the winding is what the mirror broke. Reversing each triangle restores
// the agreement, and the geometry itself does not move by a micron.
//
// A previous attempt to fix this was abandoned on the grounds that "a twin
// comparison flags the entire right side, which cannot be true" (see the
// DoubleSide note in RigModel). It flagged the entire right side because the
// entire right side IS mirrored -- that reading was right and got discarded. The
// test here does not compare twins at all: each mesh is judged against its own
// normals, so an open sheet with no meaningful "inside" is no harder than a
// closed one, and a mesh whose two are already consistent is left alone.

import * as THREE from 'three';

/**
 * Triangles sampled per mesh. The question is which of two states a mesh is in,
 * and the two populations are 0% and 100%, so a few hundred settles it.
 */
const SAMPLE_TRIS = 300;
/**
 * Fraction of sampled triangles that must disagree before a mesh is reversed.
 * Deliberately strict: at 0.9 the shipped rig splits into 100%-agree and
 * 0%-agree with nothing in between, so nothing ambiguous is ever touched.
 */
const REVERSED_AT = 0.9;

export interface WindingRepairResult {
  /** Meshes whose winding was reversed to match their normals. */
  flipped: number;
  /** Meshes already consistent, or too ambiguous to judge. */
  left: number;
  /** Meshes that could not be judged or fixed, with the reason. */
  skipped: { mesh: string; reason: string }[];
}

/**
 * Reverse the face winding of every mesh whose triangles wind against their own
 * vertex normals. Idempotent, and safe on geometry shared by several meshes: an
 * index buffer is only ever flipped once per pass.
 */
export function repairFaceWinding(root: THREE.Object3D): WindingRepairResult {
  const result: WindingRepairResult = { flipped: 0, left: 0, skipped: [] };
  // Two meshes can share one BufferGeometry (the rig dedups). Flipping the same
  // index buffer twice would put it straight back.
  const done = new Set<string>();

  const a = new THREE.Vector3();
  const u = new THREE.Vector3();
  const v = new THREE.Vector3();
  const face = new THREE.Vector3();
  const n = new THREE.Vector3();

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geom = mesh.geometry;
    if (!geom || done.has(geom.uuid)) return;

    const pos = geom.getAttribute('position');
    const nor = geom.getAttribute('normal');
    if (!pos || !nor) return; // nothing to judge it against
    const index = geom.getIndex();
    if (!index) {
      // Reversing a non-indexed mesh means permuting every attribute, and the
      // shipped rig has none, so this stays a report rather than a code path.
      result.skipped.push({ mesh: mesh.name, reason: 'sin índice' });
      return;
    }

    const tris = Math.floor(index.count / 3);
    if (tris < 4) {
      result.left++;
      return;
    }
    const step = Math.max(1, Math.floor(tris / SAMPLE_TRIS));
    let against = 0;
    let judged = 0;
    for (let t = 0; t < tris; t += step) {
      const i0 = index.getX(t * 3);
      const i1 = index.getX(t * 3 + 1);
      const i2 = index.getX(t * 3 + 2);
      a.fromBufferAttribute(pos, i0);
      u.fromBufferAttribute(pos, i1).sub(a);
      v.fromBufferAttribute(pos, i2).sub(a);
      face.crossVectors(u, v);
      if (face.lengthSq() < 1e-24) continue; // degenerate sliver, says nothing
      n.fromBufferAttribute(nor, i0);
      const d = face.dot(n);
      if (d === 0) continue;
      if (d < 0) against++;
      judged++;
    }
    if (judged === 0) {
      result.skipped.push({ mesh: mesh.name, reason: 'sin triángulos medibles' });
      return;
    }
    if (against / judged < REVERSED_AT) {
      result.left++;
      return;
    }

    const arr = index.array as Uint16Array | Uint32Array;
    for (let i = 0; i + 2 < arr.length; i += 3) {
      const t = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = t;
    }
    index.needsUpdate = true;
    done.add(geom.uuid);
    result.flipped++;
  });

  return result;
}
