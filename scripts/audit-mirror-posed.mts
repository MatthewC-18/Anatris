// Does the mirror-repaired mesh still hold together once the arm MOVES?
//
// The repair rebuilds four right-forearm meshes from their left twins and remaps
// the vertex weights by bone NAME, because the two sides' skeletons list their
// bones differently. At the bind pose that is invisible either way -- every bone
// matrix is identity there, so a mesh with completely wrong weights still looks
// perfect. The lab never shows the bind pose (even "rest" applies arm clearance),
// so this poses the arm and compares each repaired mesh with its healthy twin.
//
// A mesh whose weights are wrong collapses, and a collapsed mesh has degenerate
// normals: it renders as a flat black shape. That is the test.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-mirror-posed.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { getBoneControl, resolveArmatureName } from '../src/lib/boneMap.ts';
import { layerForMaterial } from '../src/lib/materialColors.ts';

const D2R = Math.PI / 180;
const buf = readFileSync('C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig.opt.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group; scene.updateMatrixWorld(true);
const bs = (n: string) => n.replace(/_\d+$/, '');
const matNameOf = (m: THREE.Mesh) => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as THREE.Material | undefined)?.name ?? '';
};

// --- repair, keeping a note of which twin each repaired mesh came from ---
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
const pairs: { bad: THREE.SkinnedMesh; good: THREE.SkinnedMesh; missing: string[] }[] = [];
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
  }
  // Quantized Int8 normals: drop the buffer so three.js allocates Float32,
  // otherwise computeVertexNormals truncates every normal to zero.
  dst.deleteAttribute('normal');
  dst.computeVertexNormals();
  const si = dst.getAttribute('skinIndex');
  const used = new Set<number>();
  if (si) {
    for (let i = 0; i < si.count; i++)
      for (let k = 0; k < 4; k++) {
        used.add(si.getComponent(i, k));
        si.setComponent(i, k, remap[si.getComponent(i, k)] ?? 0);
      }
  }
  dst.computeBoundingBox(); dst.computeBoundingSphere();
  bad.mesh.geometry = dst;
  // Which bones the twin's weights referenced, and whether the bad side has them.
  const missing = [...used].map((i) => goodBones[i]).filter((n) => !badBones.includes(n));
  pairs.push({ bad: bad.mesh, good: good.mesh, missing });
}

// --- pose both arms the same way ---
const AX: Record<string, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1),
};
const poseArm = (side: 'R' | 'L', moves: [string, number][]) => {
  const root = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', side));
  if (!root) return;
  for (const [id, deg] of moves) {
    const c = getBoneControl(id) as { kind: string; bone: string; axis: string; sign: Record<string, number> } | null;
    if (!c || c.kind !== 'joint') continue;
    let bone: THREE.Object3D | null = null;
    root.traverse((o) => { if (!bone && bs(o.name) === c.bone) bone = o; });
    (bone as THREE.Object3D | null)?.rotateOnAxis(AX[c.axis], deg * D2R * c.sign[side]);
  }
};

const stats = (m: THREE.SkinnedMesh) => {
  m.skeleton.update();
  const pos = m.geometry.getAttribute('position');
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  const step = Math.max(1, Math.floor(pos.count / 400));
  for (let i = 0; i < pos.count; i += step) {
    v.fromBufferAttribute(pos, i);
    m.applyBoneTransform(i, v);
    m.localToWorld(v);
    box.expandByPoint(v);
  }
  const d = box.getSize(new THREE.Vector3());
  return { d, vol: d.x * d.y * d.z, c: box.getCenter(new THREE.Vector3()) };
};

for (const label of ['bind pose', 'elbow flexion 90 + shoulder abduction 40'] as const) {
  if (label !== 'bind pose') {
    for (const side of ['R', 'L'] as const)
      poseArm(side, [['elbow-flexion', 90], ['shoulder-abduction', 40]]);
    scene.updateMatrixWorld(true);
  }
  console.log(`\n${label}:`);
  for (const p of pairs) {
    const a = stats(p.bad);
    const b = stats(p.good);
    const ratio = b.vol > 0 ? a.vol / b.vol : 0;
    const mirroredCentre = b.c.clone().setX(-b.c.x);
    console.log(
      `   volume ratio ${ratio.toFixed(2).padStart(5)}  centre off ${(a.c.distanceTo(mirroredCentre) * 100).toFixed(1).padStart(5)} cm` +
      `  size ${(a.d.x * 100).toFixed(0)}x${(a.d.y * 100).toFixed(0)}x${(a.d.z * 100).toFixed(0)} vs ${(b.d.x * 100).toFixed(0)}x${(b.d.y * 100).toFixed(0)}x${(b.d.z * 100).toFixed(0)} cm  ${p.bad.name}` +
      (p.missing.length ? `  MISSING BONES: ${p.missing.join(', ')}` : ''),
    );
  }
}
