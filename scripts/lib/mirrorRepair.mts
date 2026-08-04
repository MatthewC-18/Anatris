// RigModel's mirror repair, in one place the audit scripts can share.
//
// Z-Anatomy mirrored half the body with a -1 scale and the glTF exporter mangles
// some of those meshes: the mesh comes out rotated and collapsed while its centre
// stays roughly right. The runtime rebuilds each of them from its healthy twin at
// load. Any audit that reads the raw GLB is therefore looking at a rig the app
// never shows -- and a collapsed mesh's centre is off by centimetres, which is
// enough to make a symmetry check accuse a perfectly good muscle.
//
// Kept in step with repairMirroredMeshes in src/components/movement/RigModel.tsx.
import * as THREE from 'three';
import { layerForMaterial } from '../../src/lib/materialColors.ts';

const matNameOf = (m: THREE.Mesh): string => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as THREE.Material | undefined)?.name ?? '';
};

export function applyMirrorRepair(scene: THREE.Object3D): string[] {
  interface Twin { mesh: THREE.SkinnedMesh; dims: THREE.Vector3; vol: number; x: number }
  const groups = new Map<string, Twin[]>();
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh || !m.isSkinnedMesh || !m.geometry) return;
    if (!layerForMaterial(matNameOf(m))) return;
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
    if (Math.abs(c.x) < 0.04) return;
    g.computeBoundingBox();
    const dims = g.boundingBox!.getSize(new THREE.Vector3());
    const key = `${m.name.replace(/_\d+$/, '')}|${g.getAttribute('position').count}`;
    groups.set(key, [...(groups.get(key) ?? []), { mesh: m, dims, vol: dims.x * dims.y * dims.z, x: c.x }]);
  });
  const longAxis = (d: THREE.Vector3) => (d.x >= d.y && d.x >= d.z ? 'x' : d.y >= d.z ? 'y' : 'z');
  const mirror = new THREE.Matrix4().makeScale(-1, 1, 1);
  const bs = (n: string) => n.replace(/_\d+$/, '');
  const repaired: string[] = [];
  for (const list of groups.values()) {
    if (list.length !== 2) continue;
    const [a, b] = list;
    if (a.x * b.x > 0) continue;
    if (longAxis(a.dims) === longAxis(b.dims)) continue;
    const bad = a.vol < b.vol ? a : b;
    const good = a.vol < b.vol ? b : a;
    if (bad.vol > good.vol * 0.5) continue;
    const badBones = bad.mesh.skeleton.bones.map((x) => bs(x.name));
    const goodBones = good.mesh.skeleton.bones.map((x) => bs(x.name));
    const remap = goodBones.map((n) => badBones.indexOf(n));
    if (remap.some((i) => i < 0)) continue;
    const toBadLocal = new THREE.Matrix4()
      .copy(bad.mesh.matrixWorld).invert().multiply(mirror).multiply(good.mesh.matrixWorld);
    const dst = good.mesh.geometry.clone();
    dst.applyMatrix4(toBadLocal);
    const idx = dst.getIndex();
    if (idx) {
      const arr = idx.array as Uint16Array | Uint32Array;
      for (let i = 0; i + 2 < arr.length; i += 3) { const t = arr[i + 1]; arr[i + 1] = arr[i + 2]; arr[i + 2] = t; }
      idx.needsUpdate = true;
    }
    // The shipped normals are meshopt-quantized Int8; computeVertexNormals
    // would write floats into that buffer and truncate them all to zero.
    dst.deleteAttribute('normal');
    dst.computeVertexNormals();
    const si = dst.getAttribute('skinIndex');
    if (si) {
      for (let i = 0; i < si.count; i++)
        for (let k = 0; k < 4; k++) si.setComponent(i, k, remap[si.getComponent(i, k)] ?? 0);
      si.needsUpdate = true;
    }
    dst.computeBoundingBox();
    dst.computeBoundingSphere();
    bad.mesh.geometry = dst;
    repaired.push(bad.mesh.name);
  }
  return repaired;
}
