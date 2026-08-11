// The thorax-to-shoulder skin bridge, on a synthetic rig.
//
// The real defect lives in a 19 MB GLB the unit tests do not load, so this builds
// the same SHAPE of problem by hand: a strip of skin welded to a vertebra, with a
// thorax neighbour on one side and a shoulder neighbour on the other. What is
// asserted is the contract the real fix depends on -- the strip ends up spanning
// the two, its weights still sum to 1, and the vertices sitting on each seam
// inherit that neighbour rather than splitting the difference.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { bridgeShoulderSkin } from '../shoulderSkinBridge';

/** A skin material, so materialIsSkin() recognises the mesh as skin. */
const skinMaterial = () => new THREE.MeshStandardMaterial({ name: 'Skin' });

/**
 * A strip of `count` vertices laid along +X from x0 to x1, skinned to `bones`
 * with the given per-vertex weights (same for every vertex).
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
    positions.push(x0 + (x1 - x0) * t, 1.4, 0);
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
  const mesh = new THREE.SkinnedMesh(geom, skinMaterial());
  mesh.name = name;
  mesh.bind(skeleton);
  return mesh;
}

/** Scene with a spine armature, a shoulder armature, and three skin meshes. */
function buildScene() {
  const scene = new THREE.Group();

  const vert = new THREE.Bone();
  vert.name = 'vert_T3';
  const spineRoot = new THREE.Group();
  spineRoot.name = 'Spine_Armature';
  spineRoot.add(vert);

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

  scene.add(spineRoot, shoulderRoot);
  scene.updateMatrixWorld(true);

  const spineSkeleton = new THREE.Skeleton([vert]);
  const shoulderSkeleton = new THREE.Skeleton([clavicle, scapula, humerus]);

  // Chest skin: medial, all on the vertebra.
  const chest = makeMesh('Pectoral_region', 0.02, 0.10, 9, spineSkeleton, [
    { boneIndex: 0, w: 1 },
  ]);
  // Deltoid skin: lateral, a MIX of scapula and humerus -- the mix the strip has
  // to reproduce for its seam to hold.
  const deltoid = makeMesh('Deltoid_region', 0.20, 0.28, 9, shoulderSkeleton, [
    { boneIndex: 1, w: 0.6 },
    { boneIndex: 2, w: 0.4 },
  ]);
  // The strip between them, welded to the vertebra: the bug.
  const strip = makeMesh('Deltopectoral_triangle', 0.10, 0.20, 11, spineSkeleton, [
    { boneIndex: 0, w: 1 },
  ]);

  scene.add(chest, deltoid, strip);
  scene.updateMatrixWorld(true);
  return { scene, strip, spineSkeleton };
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

describe('bridgeShoulderSkin', () => {
  it('re-grades the strip and reports which bones it inherited', () => {
    const { scene, strip } = buildScene();
    const result = bridgeShoulderSkin(scene);
    expect(result.skipped, 'nothing should be skipped').toEqual([]);
    expect(result.bridged.map((b) => b.mesh)).toEqual(['Deltopectoral_triangle']);
    expect(result.bridged[0].armature).toBe('Shoulder_Armature_R');
    // It inherited the deltoid's OWN mix, not a single hardcoded bone.
    expect(result.bridged[0].bones.sort()).toEqual(['humerus_gh', 'scapula']);
    // The shoulder bones were spliced into the SPINE skeleton, which had none.
    expect(strip.skeleton.bones.map((b) => b.name)).toContain('scapula');
    expect(strip.skeleton.bones.map((b) => b.name)).toContain('humerus_gh');
  });

  it('leaves every vertex a partition of unity', () => {
    const { scene, strip } = buildScene();
    bridgeShoulderSkin(scene);
    const sw = strip.geometry.getAttribute('skinWeight');
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

  it('hands each end of the strip to the neighbour it seams against', () => {
    const { scene, strip } = buildScene();
    bridgeShoulderSkin(scene);
    const first = weightsAt(strip, 0); // chest end
    const last = weightsAt(strip, strip.geometry.getAttribute('position').count - 1);
    // Chest end stays on the vertebra; shoulder end goes to the girdle.
    expect(first.vert_T3 ?? 0).toBeGreaterThan(0.85);
    expect(last.vert_T3 ?? 0).toBeLessThan(0.15);
    // ...and the shoulder end reproduces the deltoid's 60/40 split, which is what
    // actually closes the seam. Binding it to the scapula alone left a 10 cm gap.
    const shoulderTotal = (last.scapula ?? 0) + (last.humerus_gh ?? 0);
    expect(shoulderTotal).toBeGreaterThan(0.85);
    expect((last.scapula ?? 0) / shoulderTotal).toBeCloseTo(0.6, 1);
    expect((last.humerus_gh ?? 0) / shoulderTotal).toBeCloseTo(0.4, 1);
  });

  it('moves monotonically from thorax to shoulder across the strip', () => {
    // A non-monotonic blend would crease: a band of skin pulled toward the arm
    // sitting between two bands that stayed on the chest.
    const { scene, strip } = buildScene();
    bridgeShoulderSkin(scene);
    const count = strip.geometry.getAttribute('position').count;
    let prev = Infinity;
    for (let i = 0; i < count; i++) {
      const thorax = weightsAt(strip, i).vert_T3 ?? 0;
      expect(thorax, `vertex ${i}`).toBeLessThanOrEqual(prev + 1e-6);
      prev = thorax;
    }
  });

  it('leaves the strip alone when it has no shoulder neighbour to bridge to', () => {
    // Better to keep a known-imperfect binding than to invent a target: a strip
    // with nothing on its far side has nothing to interpolate towards.
    const { scene } = buildScene();
    const deltoid = scene.getObjectByName('Deltoid_region');
    deltoid?.removeFromParent();
    const result = bridgeShoulderSkin(scene);
    expect(result.bridged).toEqual([]);
    expect(result.skipped.map((s) => s.reason)).toEqual(['sin vecinos a ambos lados']);
  });
});
