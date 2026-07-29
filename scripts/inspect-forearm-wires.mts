// Replicates RigModel's prepare-pass VISIBILITY filter, then lists the meshes
// that survive in the forearm / wrist band and flags thin, elongated ones --
// the "alambres" (wires) the user sees spilling out of the forearm.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import {
  colorForMaterial,
  materialIsVisibleAnatomy,
  materialIsSkin,
  tissueClassForMaterial,
} from '../src/lib/materialColors.ts';

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
const inDistalRegion = (c: THREE.Vector3) => {
  const hand = c.y > 0.6 && c.y < 0.86 && Math.abs(c.x) > 0.18;
  const foot = c.y < 0.12;
  return hand || foot;
};
const SPIKE_RATIO = 3.5, SPIKE_MAX_M = 0.13;
const isCorruptedSpike = (mesh: THREE.Mesh) => {
  const pos = mesh.geometry.getAttribute('position');
  if (!pos || pos.count < 8) return false;
  const step = Math.max(1, Math.floor(pos.count / 160));
  const c = new THREE.Vector3(); const v = new THREE.Vector3(); let n = 0;
  for (let i = 0; i < pos.count; i += step) { v.fromBufferAttribute(pos, i); mesh.localToWorld(v); c.add(v); n++; }
  if (n < 4) return false;
  c.multiplyScalar(1 / n);
  const d: number[] = [];
  for (let i = 0; i < pos.count; i += step) { v.fromBufferAttribute(pos, i); mesh.localToWorld(v); d.push(v.distanceTo(c)); }
  d.sort((a, b) => a - b);
  const median = d[d.length >> 1] || 1e-9, max = d[d.length - 1] || 0;
  return max > SPIKE_MAX_M && max / median > SPIKE_RATIO;
};
const center = (m: THREE.Mesh) => {
  const g = m.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
  return g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
};
const isGroupContainer = (name: string) => /g0\d\d$/.test(name) || /_system/i.test(name) || /^General[_ ]terms$/i.test(name);

// world-space AABB dims + longest/shortest ratio ("wireiness")
const dims = (m: THREE.Mesh) => {
  const box = new THREE.Box3().setFromObject(m);
  const s = new THREE.Vector3(); box.getSize(s);
  const arr = [s.x, s.y, s.z].sort((a, b) => a - b);
  const thin = arr[1]; // second-smallest cross dimension
  const long = arr[2];
  const ratio = long / Math.max(arr[0], 1e-6);
  return { s, long, thin, ratio };
};

interface Row { name: string; mat: string; tissue: string; c: THREE.Vector3; long: number; thin: number; ratio: number }
const rows: Row[] = [];

scene.traverse((o) => {
  const mesh = o as THREE.Mesh;
  if (!mesh.isMesh) return;
  const mn = matName(mesh);
  const base = colorForMaterial(mn);
  if (base === null || isGroupContainer(mesh.name)) return; // hidden: reference/containers
  const c = center(mesh);
  if (inDistalRegion(c)) return; // distal cap handles these
  if (!materialIsVisibleAnatomy(mn)) return; // hidden
  // forearm wire cull (mirrors RigModel)
  const inArmBand = Math.abs(c.x) > 0.16 && c.y > 0.82 && c.y < 1.4;
  if (inArmBand && tissueClassForMaterial(mn) === 'connective') return; // hidden
  if (isCorruptedSpike(mesh)) return; // hidden by spike guard
  // VISIBLE. Only care about the arm band.
  if (!(Math.abs(c.x) > 0.16 && c.y > 0.55 && c.y < 1.35)) return;
  const d = dims(mesh);
  rows.push({ name: mesh.name.slice(0, 44), mat: mn, tissue: tissueClassForMaterial(mn), c, long: d.long, thin: d.thin, ratio: d.ratio });
});

rows.sort((a, b) => b.ratio - a.ratio);
console.log(`GLB: ${GLB}`);
console.log(`visible arm-band meshes: ${rows.length}\n`);
console.log('ratio  long(m) thin(m)  y      x       tissue      name  [mat]');
for (const r of rows) {
  const flag = r.long > 0.10 && r.thin < 0.02 ? '  <== WIRE' : '';
  console.log(
    `${r.ratio.toFixed(1).padStart(5)}  ${r.long.toFixed(3)}  ${r.thin.toFixed(3)}  ${r.c.y.toFixed(2)}  ${r.c.x.toFixed(2).padStart(6)}  ${r.tissue.padEnd(10)}  ${r.name}  [${r.mat}]${flag}`,
  );
}

const wires = rows.filter((r) => r.long > 0.10 && r.thin < 0.02);
console.log(`\nWIRE candidates (long>0.10m & thin<0.02m): ${wires.length}`);
