// Detects the glTF negative-scale mirror-export bug on the newly-bound trunk skin:
// pairs each trunk skin mesh with its X-mirror twin (matched by mirrored center)
// and compares their sorted AABB dimensions. A correctly-exported mirror pair has
// near-identical sorted dims; a mis-oriented one (exported rotated ~90 deg) has
// swapped dims -> flagged.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { materialIsSkin, colorForMaterial } from '../src/lib/materialColors.ts';

const GLB = process.argv[2] || 'C:/Users/Matthew/Documents/Fisio/public/_rig-bodyskin-test.glb';
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise<any>((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const scene = gltf.scene as THREE.Group;
scene.updateMatrixWorld(true);
const matName = (m: THREE.Mesh) => { const f = Array.isArray(m.material) ? m.material[0] : m.material; return (f as any)?.name ?? ''; };

interface S { name: string; c: THREE.Vector3; dims: number[] }
const skins: S[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh || !materialIsSkin(matName(m)) || colorForMaterial(matName(m)) === null) return;
  const b = new THREE.Box3().setFromObject(m);
  if (b.isEmpty() || !isFinite(b.min.x)) return;
  const c = new THREE.Vector3(); b.getCenter(c);
  // whole body (y-up in the GLB); head included to catch thin ear-shell mirrors
  if (!(Math.abs(c.x) < 0.22 && c.y > 0.45 && c.y < 1.7)) return;
  const s = new THREE.Vector3(); b.getSize(s);
  skins.push({ name: m.name.slice(0, 34), c, dims: [s.x, s.y, s.z].sort((a, b2) => a - b2) });
});

// pair by mirrored center
const used = new Set<number>();
let pairs = 0, flagged = 0, unpaired = 0;
const problems: string[] = [];
for (let i = 0; i < skins.length; i++) {
  if (used.has(i)) continue;
  const a = skins[i];
  if (Math.abs(a.c.x) < 0.03) { continue; } // near-midline, no distinct twin
  let bestJ = -1, bestD = 0.04;
  for (let j = 0; j < skins.length; j++) {
    if (j === i || used.has(j)) continue;
    const b = skins[j];
    const d = Math.hypot(a.c.x + b.c.x, a.c.y - b.c.y, a.c.z - b.c.z);
    if (d < bestD) { bestD = d; bestJ = j; }
  }
  if (bestJ < 0) { unpaired++; continue; }
  used.add(i); used.add(bestJ);
  pairs++;
  const b = skins[bestJ];
  const err = Math.max(...a.dims.map((d, k) => Math.abs(d - b.dims[k])));
  if (err > 0.02) {
    flagged++;
    problems.push(`  MISMATCH err=${err.toFixed(3)}  ${a.name} [${a.dims.map((d) => d.toFixed(2)).join(',')}]  vs  ${b.name} [${b.dims.map((d) => d.toFixed(2)).join(',')}]`);
  }
}
console.log(`GLB: ${GLB}`);
console.log(`trunk+thigh skin meshes: ${skins.length}  twin-pairs: ${pairs}  midline/unpaired: ${unpaired}`);
console.log(`mis-oriented pairs (sorted-dim mismatch > 2cm): ${flagged}`);
if (problems.length) console.log(problems.join('\n')); else console.log('  all twin pairs dimension-consistent (no mirror mis-orientation) OK');
