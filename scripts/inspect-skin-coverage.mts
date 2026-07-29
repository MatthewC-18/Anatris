// Maps the SKIN/Nail meshes across the whole body so we know whether a full-body
// skin cap is possible from the shipped GLB. Buckets skin centers into vertical
// bands and prints per-band counts + AABB extents.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { materialIsSkin, colorForMaterial } from '../src/lib/materialColors.ts';

const GLB = process.argv[2] || 'C:/Users/Matthew/Documents/Fisio/rig-src/cuerpo-rig.glb';
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise<any>((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const scene = gltf.scene as THREE.Group;
scene.updateMatrixWorld(true);

const matName = (m: THREE.Mesh) => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as any)?.name ?? '';
};
const center = (m: THREE.Mesh) => {
  const g = m.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
  return g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
};

// whole-body bounds (skinned meshes only)
const bodyBox = new THREE.Box3();
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isSkinnedMesh) return;
  const mn = matName(m);
  if (colorForMaterial(mn) === null) return;
  const b = new THREE.Box3().setFromObject(m);
  if (!b.isEmpty() && isFinite(b.min.x)) bodyBox.union(b);
});
console.log(`GLB: ${GLB}`);
console.log(`body AABB  x[${bodyBox.min.x.toFixed(2)}, ${bodyBox.max.x.toFixed(2)}]  y[${bodyBox.min.y.toFixed(2)}, ${bodyBox.max.y.toFixed(2)}]  z[${bodyBox.min.z.toFixed(2)}, ${bodyBox.max.z.toFixed(2)}]`);

interface Row { name: string; mat: string; c: THREE.Vector3 }
const skins: Row[] = [];
const matCount = new Map<string, number>();
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const mn = matName(m);
  if (!materialIsSkin(mn)) return;
  const c = center(m);
  skins.push({ name: m.name.slice(0, 40), mat: mn, c });
  matCount.set(mn, (matCount.get(mn) || 0) + 1);
});

console.log(`\ntotal skin/nail meshes: ${skins.length}`);
console.log('by material:');
for (const [m, c] of [...matCount.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(c).padStart(3)}  ${m}`);

// vertical band histogram (0.1 m bins)
const bands = new Map<number, number>();
for (const s of skins) {
  const k = Math.floor(s.c.y * 10) / 10;
  bands.set(k, (bands.get(k) || 0) + 1);
}
console.log('\nskin count by y-band (0.1 m):');
for (const k of [...bands.keys()].sort((a, b) => a - b)) {
  console.log(`  y=${k.toFixed(1)}  ${'#'.repeat(bands.get(k)!)} (${bands.get(k)})`);
}

// approximate coverage: does skin exist for head/trunk/arm/leg?
const has = (pred: (c: THREE.Vector3) => boolean) => skins.some((s) => pred(s.c));
console.log('\ncoverage check (any skin present):');
console.log(`  head/neck  y>1.45         : ${has((c) => c.y > 1.45)}`);
console.log(`  trunk      0.95<y<1.45,|x|<0.2 : ${has((c) => c.y > 0.95 && c.y < 1.45 && Math.abs(c.x) < 0.2)}`);
console.log(`  arm        |x|>0.2, y>0.85  : ${has((c) => Math.abs(c.x) > 0.2 && c.y > 0.85)}`);
console.log(`  hand       |x|>0.18, 0.6<y<0.86 : ${has((c) => Math.abs(c.x) > 0.18 && c.y > 0.6 && c.y < 0.86)}`);
console.log(`  thigh/leg  |x|<0.2, 0.12<y<0.95 : ${has((c) => Math.abs(c.x) < 0.2 && c.y > 0.12 && c.y < 0.95)}`);
console.log(`  foot       y<0.12          : ${has((c) => c.y < 0.12)}`);
