// Scapulohumeral muscle weights, on a synthetic rig.
//
// The real defect lives in a 19 MB GLB the unit tests do not load, so this builds
// the same SHAPE of problem by hand: a muscle laid between a scapula bone mesh
// and a humerus bone mesh, welded entirely to the humerus -- which is how the
// teres minor and the short head of biceps actually ship, though both originate
// on the scapula.
//
// What is asserted is the contract the real fix depends on: the end lying against
// each bone ends up bound to that bone, the belly between them interpolates
// without creasing, and the weights stay a partition of unity so the rest pose is
// preserved exactly.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { gradeShoulderMuscleBinding } from '../shoulderMuscleBinding';

/**
 * A row of `count` vertices laid along +X from x0 to x1, skinned to `bones` with
 * the given per-vertex weights (the same flat mix on every vertex, which is the
 * bug).
 */
function makeMesh(
  name: string,
  x0: number,
  x1: number,
  count: number,
  skeleton: THREE.Skeleton,
  weights: { boneIndex: number; w: number }[],
): THREE.SkinnedMesh {
  const positions: number[] = [];
  const skinIndex: number[] = [];
  const skinWeight: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    positions.push(x0 + (x1 - x0) * t, 1.35, 0);
    const idx = [0, 0, 0, 0];
    const wts = [0, 0, 0, 0];
    weights.slice(0, 4).forEach((entry, k) => {
      idx[k] = entry.boneIndex;
      wts[k] = entry.w;
    });
    skinIndex.push(...idx);
    skinWeight.push(...wts);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  const mesh = new THREE.SkinnedMesh(geom, new THREE.MeshStandardMaterial({ name: 'Flexion' }));
  mesh.name = name;
  mesh.bind(skeleton);
  return mesh;
}

/**
 * A plain (unskinned) BONE mesh, which is what the distance clouds are built
 * from. The material matters: `Scapular_spinal_part_of_deltoid_muscle` and the
 * `Scapular_region` skin both begin with "Scapula", so the anchors are picked by
 * layer as well as by name.
 */
function makeBoneMesh(name: string, x0: number, x1: number, count: number): THREE.Mesh {
  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    positions.push(x0 + (x1 - x0) * t, 1.35, 0);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ name: 'Bone-1' }));
  mesh.name = name;
  return mesh;
}

function buildScene() {
  const scene = new THREE.Group();

  const clavicle = new THREE.Bone();
  clavicle.name = 'clavicle';
  const scapula = new THREE.Bone();
  scapula.name = 'scapula';
  const humerus = new THREE.Bone();
  humerus.name = 'humerus_gh';
  clavicle.add(scapula);
  scapula.add(humerus);
  const shoulderRoot = new THREE.Group();
  shoulderRoot.name = 'Shoulder_Armature_R';
  shoulderRoot.add(clavicle);
  scene.add(shoulderRoot);
  scene.updateMatrixWorld(true);

  const skeleton = new THREE.Skeleton([clavicle, scapula, humerus]);

  // The two anchors: scapula medial, humerus lateral. Dense enough that the gap
  // between cloud points does not show up as a wobble in the gradient -- real
  // bone surfaces are dense, and a sparse stand-in would make the monotonicity
  // check measure the fixture rather than the code.
  const scapBone = makeBoneMesh('Scapula', 0.06, 0.12, 61);
  const humBone = makeBoneMesh('Humerus', 0.22, 0.30, 81);

  // Teres minor's real bug: the whole muscle on the humerus, though its medial
  // end lies against the scapula.
  const teres = makeMesh('Teres_minor_muscle', 0.07, 0.28, 15, skeleton, [
    { boneIndex: 2, w: 1 },
  ]);
  // A muscle the fix must NOT touch: the deltoid is already graded by its parts.
  const deltoid = makeMesh('Scapular_spinal_part_of_deltoid_muscle', 0.10, 0.26, 9, skeleton, [
    { boneIndex: 1, w: 0.6 },
    { boneIndex: 2, w: 0.4 },
  ]);

  scene.add(scapBone, humBone, teres, deltoid);
  scene.updateMatrixWorld(true);
  return { scene, teres, deltoid };
}

/** Bone name -> weight for one vertex of a mesh. */
function weightsAt(mesh: THREE.SkinnedMesh, i: number): Record<string, number> {
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  const out: Record<string, number> = {};
  for (let k = 0; k < 4; k++) {
    const w = sw.getComponent(i, k);
    if (w <= 1e-6) continue;
    const name = mesh.skeleton.bones[si.getComponent(i, k)]?.name ?? '?';
    out[name] = (out[name] ?? 0) + w;
  }
  return out;
}

describe('gradeShoulderMuscleBinding', () => {
  it('re-grades a muscle that crosses the joint, and says how far it graded it', () => {
    const { scene } = buildScene();
    const result = gradeShoulderMuscleBinding(scene);
    expect(result.skipped, 'nothing should be skipped').toEqual([]);
    expect(result.graded.map((g) => g.mesh)).toEqual(['Teres_minor_muscle']);
    expect(result.graded[0].armature).toBe('Shoulder_Armature_R');
    // A muscle still bound to one bone would report a spread of zero.
    expect(result.graded[0].maxScapula - result.graded[0].minScapula).toBeGreaterThan(0.8);
  });

  it('puts the origin on the scapula and the insertion on the humerus', () => {
    // This is the whole fix. Bound flat to the humerus, the medial end travelled
    // with the arm and pushed out through the skin at the front of the shoulder.
    const { scene, teres } = buildScene();
    gradeShoulderMuscleBinding(scene);
    const count = teres.geometry.getAttribute('position').count;
    const medial = weightsAt(teres, 0);
    const lateral = weightsAt(teres, count - 1);
    expect(medial.scapula ?? 0, 'medial end on the scapula').toBeGreaterThan(0.85);
    expect(lateral.humerus_gh ?? 0, 'lateral end on the humerus').toBeGreaterThan(0.85);
  });

  it('leaves every vertex a partition of unity, so the rest pose is untouched', () => {
    const { scene, teres } = buildScene();
    gradeShoulderMuscleBinding(scene);
    const sw = teres.geometry.getAttribute('skinWeight');
    for (let i = 0; i < sw.count; i++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        expect(w, `vertex ${i} slot ${k} must not be negative`).toBeGreaterThanOrEqual(0);
        sum += w;
      }
      expect(sum, `vertex ${i} weights must sum to 1`).toBeCloseTo(1, 5);
    }
  });

  it('moves monotonically from origin to insertion', () => {
    // A non-monotonic blend would crease: a band of muscle pulled toward the arm
    // sitting between two bands that stayed on the blade.
    const { scene, teres } = buildScene();
    gradeShoulderMuscleBinding(scene);
    const count = teres.geometry.getAttribute('position').count;
    let prev = Infinity;
    for (let i = 0; i < count; i++) {
      const scap = weightsAt(teres, i).scapula ?? 0;
      expect(scap, `vertex ${i}`).toBeLessThanOrEqual(prev + 1e-6);
      prev = scap;
    }
  });

  it('does not touch muscles that do not cross the glenohumeral joint', () => {
    // The deltoid already ships graded by its three parts, and the latissimus and
    // pectoralis span the THORAX to the humerus -- a different pair of bones.
    // Re-weighting either from here would move geometry that is currently right.
    const { scene, deltoid } = buildScene();
    gradeShoulderMuscleBinding(scene);
    const w = weightsAt(deltoid, 0);
    expect(w.scapula).toBeCloseTo(0.6, 5);
    expect(w.humerus_gh).toBeCloseTo(0.4, 5);
  });

  it('skips a muscle whose side has no bones to measure against', () => {
    // Better to keep a known-imperfect binding than to invent a target.
    const { scene } = buildScene();
    scene.getObjectByName('Scapula')?.removeFromParent();
    const result = gradeShoulderMuscleBinding(scene);
    expect(result.graded).toEqual([]);
    expect(result.skipped.map((s) => s.reason)).toEqual(['sin huesos de referencia en R']);
  });
});
