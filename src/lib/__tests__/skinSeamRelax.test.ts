// Welding the skin mosaic, on a synthetic rig.
//
// The real defect lives in a 19 MB GLB the unit tests do not load, so this builds
// the same SHAPE of problem by hand: two skin patches that SHARE a vertex at rest
// and follow different bones -- which is how `Deltoid_region_3` (scapula) and
// `Lateral_region_of_thorax_1` (vert_T9) actually ship.
//
// What is asserted is the contract the fix rests on: a shared vertex ends up with
// ONE weight vector, so the two copies land in the same place under any pose and
// the seam cannot open; skin away from a disagreeing seam is not touched; and the
// weights stay a partition of unity so the rest pose is preserved exactly.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { relaxSkinSeams } from '../skinSeamRelax';

/** A skin material, so materialIsSkin() recognises the mesh as skin. */
const skinMaterial = () => new THREE.MeshStandardMaterial({ name: 'Skin' });

/**
 * A strip of `count` vertices along +X from x0 to x1 at shoulder height, welded
 * to a single bone, and triangulated so the pass has a mesh graph to walk.
 */
function makeStrip(
  name: string,
  x0: number,
  x1: number,
  count: number,
  skeleton: THREE.Skeleton,
  boneIndex: number,
): THREE.SkinnedMesh {
  const positions: number[] = [];
  const skinIndex: number[] = [];
  const skinWeight: number[] = [];
  // Two rows, so the strip has real triangles.
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);
      positions.push(x0 + (x1 - x0) * t, 1.35 + row * 0.01, 0);
      skinIndex.push(boneIndex, 0, 0, 0);
      skinWeight.push(1, 0, 0, 0);
    }
  const index: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    const a = i, b = i + 1, c = count + i, d = count + i + 1;
    index.push(a, b, c, b, d, c);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  geom.setIndex(index);
  const mesh = new THREE.SkinnedMesh(geom, skinMaterial());
  mesh.name = name;
  mesh.bind(skeleton);
  return mesh;
}

/**
 * Two patches that MEET at x = 0.16: the chest side on a vertebra, the deltoid
 * side on the scapula. Their shared vertices are the seam that tore.
 */
function buildScene() {
  const scene = new THREE.Group();

  const vertT9 = new THREE.Bone();
  vertT9.name = 'vert_T9';
  const spineRoot = new THREE.Group();
  spineRoot.name = 'Spine_Armature';
  spineRoot.add(vertT9);

  const clavicle = new THREE.Bone();
  clavicle.name = 'clavicle';
  const scapula = new THREE.Bone();
  scapula.name = 'scapula';
  clavicle.add(scapula);
  const shoulderRoot = new THREE.Group();
  shoulderRoot.name = 'Shoulder_Armature_R';
  shoulderRoot.add(clavicle);

  scene.add(spineRoot, shoulderRoot);
  scene.updateMatrixWorld(true);

  const spineSkeleton = new THREE.Skeleton([vertT9]);
  const shoulderSkeleton = new THREE.Skeleton([clavicle, scapula]);

  // Chest 0.08..0.16, deltoid 0.16..0.24: they share the vertices at x = 0.16.
  const chest = makeStrip('Lateral_region_of_thorax', 0.08, 0.16, 9, spineSkeleton, 0);
  const deltoid = makeStrip('Deltoid_region', 0.16, 0.24, 9, shoulderSkeleton, 1);

  scene.add(chest, deltoid);
  scene.updateMatrixWorld(true);
  return { scene, chest, deltoid };
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

describe('relaxSkinSeams', () => {
  it('finds the weld and reports that its two sides disagreed', () => {
    const { scene } = buildScene();
    const result = relaxSkinSeams(scene);
    expect(result.welds, 'the two patches share vertices').toBeGreaterThan(0);
    expect(result.disagreeing, 'and those vertices followed different bones')
      .toBeGreaterThan(0);
    // vert_T9 100% against scapula 100% is as far apart as two vectors get.
    expect(result.worst).toBeCloseTo(1, 5);
    expect(result.meshes).toBe(2);
    expect(result.skipped).toEqual([]);
  });

  it('gives the shared vertex ONE weight vector, so the seam cannot open', () => {
    // This is the whole fix, and it is a guarantee rather than an improvement:
    // identical weights put the two copies in identical places under any pose.
    const { scene, chest, deltoid } = buildScene();
    relaxSkinSeams(scene);
    // The chest's last column and the deltoid's first are the same points.
    const a = weightsAt(chest, 8);
    const b = weightsAt(deltoid, 0);
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys)
      expect(a[k] ?? 0, `bone ${k} on both sides of the seam`).toBeCloseTo(b[k] ?? 0, 5);
    // ...and it is a genuine compromise, not one side surrendering.
    expect(a.vert_T9 ?? 0).toBeGreaterThan(0.1);
    expect(a.scapula ?? 0).toBeGreaterThan(0.1);
  });

  it('splices the missing bone into each patch’s own skeleton', () => {
    // The chest patch is skinned to the SPINE skeleton, which has no scapula in
    // it, and the deltoid patch to the shoulder skeleton, which has no vertebra.
    const { scene, chest, deltoid } = buildScene();
    relaxSkinSeams(scene);
    expect(chest.skeleton.bones.map((b) => b.name)).toContain('scapula');
    expect(deltoid.skeleton.bones.map((b) => b.name)).toContain('vert_T9');
  });

  it('leaves every vertex a partition of unity, so the rest pose is untouched', () => {
    const { scene, chest, deltoid } = buildScene();
    relaxSkinSeams(scene);
    for (const mesh of [chest, deltoid]) {
      const sw = mesh.geometry.getAttribute('skinWeight');
      for (let i = 0; i < sw.count; i++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          const w = sw.getComponent(i, k);
          expect(w, `${mesh.name} vertex ${i} slot ${k}`).toBeGreaterThanOrEqual(0);
          sum += w;
        }
        expect(sum, `${mesh.name} vertex ${i} must sum to 1`).toBeCloseTo(1, 5);
      }
    }
  });

  it('spreads the compromise instead of creasing along the seam', () => {
    // A weld alone holds the seam and kinks the skin at it. Walking away from the
    // seam, each patch has to come back towards the bone it started on.
    const { scene, chest } = buildScene();
    relaxSkinSeams(scene);
    const atSeam = weightsAt(chest, 8).vert_T9 ?? 0;
    const oneIn = weightsAt(chest, 7).vert_T9 ?? 0;
    const farthest = weightsAt(chest, 0).vert_T9 ?? 0;
    expect(oneIn, 'more thoracic one vertex in from the seam').toBeGreaterThan(atSeam);
    expect(farthest, 'and fully thoracic at the far end').toBeGreaterThan(oneIn);
  });

  it('never welds across the midline, where the two sides share bone names', () => {
    // `scapula` on the right and `scapula` on the left are different bones with
    // the SAME name, so a weld spanning x = 0 could not say which one it meant.
    // Skin that close to the midline is left exactly as it shipped.
    const { scene } = buildScene();
    const chest = scene.getObjectByName('Lateral_region_of_thorax') as THREE.SkinnedMesh;
    const deltoid = scene.getObjectByName('Deltoid_region') as THREE.SkinnedMesh;
    chest.position.x = -0.09; // 0.08..0.16 -> -0.01..0.07
    deltoid.position.x = -0.09; // 0.16..0.24 -> 0.07..0.15
    scene.updateMatrixWorld(true);
    const result = relaxSkinSeams(scene);
    // Their shared column now sits at x = 0.07, and everything medial to
    // x = 0.02 is out of scope, so the seam itself still welds...
    expect(result.disagreeing).toBeGreaterThan(0);
    // ...but the vertices inside the midline band keep the bone they shipped on.
    expect(weightsAt(chest, 0)).toEqual({ vert_T9: 1 });
  });

  it('leaves skin far from a disagreeing seam exactly as it shipped', () => {
    // The pass is allowed to touch the torn seam and a few rings around it, and
    // nothing else: skin that was already right must not move.
    const { scene } = buildScene();
    const lone = makeStrip(
      'Infrascapular_region',
      -0.24,
      -0.16,
      9,
      new THREE.Skeleton([scene.getObjectByName('vert_T9') as THREE.Bone]),
      0,
    );
    scene.add(lone);
    scene.updateMatrixWorld(true);
    relaxSkinSeams(scene);
    for (let i = 0; i < 9; i++) expect(weightsAt(lone, i), `vertex ${i}`).toEqual({ vert_T9: 1 });
  });
});
