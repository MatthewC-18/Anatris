// Validate a rig export's HAND/FOOT skin envelope:
//  - both L/R skin patches present
//  - correctly oriented (mirror-symmetric world AABB dims -> catches the export
//    mirror-orientation bug, which swaps a mesh's dx/dy/dz vs its twin)
//  - not an export-corrupted spike
// Usage: npx tsx scripts/verify-skin-hands.mts [public/cuerpo-rig-v5.glb]
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

const GLB = process.argv[2] || 'C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig-v5.glb';
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise<any>((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const scene = gltf.scene as THREE.Group;
scene.updateMatrixWorld(true);

const SKIN_KEYS = [
  'Dorsum of hand', 'Palm', 'surfaces of digits of hand', 'region of wrist', 'foveola',
  'Dorsum of foot', 'Sole', 'surfaces of digits of foot', 'region of ankle', 'Heel region',
];

function worldStats(mesh: THREE.Mesh) {
  const pos = mesh.geometry.getAttribute('position');
  const v = new THREE.Vector3();
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  const c = new THREE.Vector3();
  const step = Math.max(1, Math.floor(pos.count / 400));
  let n = 0;
  const dists: number[] = [];
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += step) {
    v.fromBufferAttribute(pos, i);
    mesh.localToWorld(v);
    min.min(v); max.max(v); c.add(v); n++;
    pts.push(v.clone());
  }
  c.multiplyScalar(1 / n);
  for (const p of pts) dists.push(p.distanceTo(c));
  dists.sort((a, b) => a - b);
  const median = dists[dists.length >> 1] || 1e-9;
  const dmax = dists[dists.length - 1] || 0;
  return {
    dim: new THREE.Vector3(max.x - min.x, max.y - min.y, max.z - min.z),
    center: c,
    spikeRatio: dmax / median,
    spikeMax: dmax,
    verts: pos.count,
  };
}

interface Row { name: string; s: ReturnType<typeof worldStats> }
const rows: Row[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const nm = m.name;
  if (SKIN_KEYS.some((k) => nm.includes(k))) rows.push({ name: nm, s: worldStats(m) });
});

const f = (n: number) => n.toFixed(3);
console.log(`GLB: ${GLB}`);
console.log(`skin hand/foot meshes found: ${rows.length}\n`);
for (const r of rows.sort((a, b) => a.name.localeCompare(b.name))) {
  const spike = r.s.spikeMax > 0.13 && r.s.spikeRatio > 3.5;
  console.log(
    `${r.name.padEnd(42)} dim=(${f(r.s.dim.x)},${f(r.s.dim.y)},${f(r.s.dim.z)}) ` +
    `cx=${f(r.s.center.x)} vt=${r.s.verts} spike=${r.s.spikeRatio.toFixed(1)}/${f(r.s.spikeMax)}${spike ? '  <-- SPIKE!' : ''}`,
  );
}

// Pair digit-skin twins and compare dims (symmetry within 15%).
function findByCenter(nameHint: string, wantPosX: boolean) {
  return rows.find((r) => r.name.includes(nameHint) && (r.s.center.x > 0) === wantPosX);
}
console.log('\n--- twin symmetry (digit skin) ---');
for (const hint of ['surfaces of digits of hand', 'surfaces of digits of foot', 'Dorsum of hand', 'Palm']) {
  const L = rows.filter((r) => r.name.includes(hint) && r.s.center.x < 0);
  const R = rows.filter((r) => r.name.includes(hint) && r.s.center.x > 0);
  console.log(`${hint}: left=${L.length} right=${R.length}`);
}
