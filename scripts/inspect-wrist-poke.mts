// Finds the non-skin meshes near the WRIST that poke OUT past the skin envelope
// (the red spindles the user sees "salidas" at the wrist). For each visible
// muscle/bone/connective in the wrist band it prints how far it reaches laterally
// and forward, next to how far the SKIN reaches at the same height -- anything
// beyond the skin is what sticks out.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import {
  colorForMaterial,
  materialIsSkin,
  layerForMaterial,
  tissueClassForMaterial,
} from '../src/lib/materialColors.ts';

const GLB = process.argv[2] || 'C:/Users/Matthew/Documents/Fisio/rig-src/cuerpo-rig.glb';
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise<any>((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const scene = gltf.scene as THREE.Group;
scene.updateMatrixWorld(true);

const matName = (m: THREE.Mesh) => { const f = Array.isArray(m.material) ? m.material[0] : m.material; return (f as any)?.name ?? ''; };
const inDistalRegion = (c: THREE.Vector3) => (c.y > 0.6 && c.y < 0.86 && Math.abs(c.x) > 0.18) || c.y < 0.12;
const inArmBand = (c: THREE.Vector3) => Math.abs(c.x) > 0.16 && c.y > 0.82 && c.y < 1.4;
const isGroupContainer = (n: string) => /g0\d\d$/.test(n) || /_system/i.test(n) || /^General[_ ]terms$/i.test(n);
const center = (m: THREE.Mesh) => { const g = m.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); return g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld); };
const box = (m: THREE.Mesh) => new THREE.Box3().setFromObject(m);

// SKIN lateral reach as a function of height: for each y bin, the max |x| the
// skin surface reaches (per side). Muscles beyond this at that height poke out.
const skinReach = new Map<number, { maxAbsXpos: number; maxAbsXneg: number }>();
const yKey = (y: number) => Math.round(y * 50) / 50; // 2 cm bins
scene.traverse((o) => {
  const m = o as THREE.Mesh; if (!m.isMesh || !materialIsSkin(matName(m))) return;
  const b = box(m);
  for (let y = Math.floor(b.min.y * 50) / 50; y <= b.max.y; y += 0.02) {
    const k = yKey(y);
    const e = skinReach.get(k) || { maxAbsXpos: 0, maxAbsXneg: 0 };
    if (b.max.x > 0) e.maxAbsXpos = Math.max(e.maxAbsXpos, b.max.x);
    if (b.min.x < 0) e.maxAbsXneg = Math.max(e.maxAbsXneg, -b.min.x);
    skinReach.set(k, e);
  }
});
const skinAbsXAt = (y: number, sideSign: number) => {
  const e = skinReach.get(yKey(y));
  if (!e) return 0;
  return sideSign >= 0 ? e.maxAbsXpos : e.maxAbsXneg;
};

interface Row { name: string; mat: string; layer: string; c: THREE.Vector3; reachAbsX: number; skinAbsX: number; poke: number; fwdZ: number }
const rows: Row[] = [];
scene.traverse((o) => {
  const mesh = o as THREE.Mesh;
  if (!mesh.isMesh) return;
  const mn = matName(mesh);
  const base = colorForMaterial(mn);
  if (base === null || isGroupContainer(mesh.name)) return;
  const c = center(mesh);
  if (inDistalRegion(c)) return;
  const layer = layerForMaterial(mn);
  if (layer === null || layer === 'skin') return;
  if (layer === 'connective' && inArmBand(c)) return; // wire-culled
  // wrist band: distal forearm just above the hand cap
  if (!(Math.abs(c.x) > 0.18 && c.y > 0.83 && c.y < 1.0)) return;
  const b = box(mesh);
  const side = Math.sign(c.x);
  const reachAbsX = side >= 0 ? b.max.x : -b.min.x;
  const skinAbsX = skinAbsXAt(c.y, side);
  const poke = reachAbsX - skinAbsX; // >0 => sticks out past skin
  const fwdZ = Math.max(b.max.z, -b.min.z);
  rows.push({ name: mesh.name.slice(0, 40), mat: mn, layer, c, reachAbsX, skinAbsX, poke, fwdZ });
});

rows.sort((a, b) => b.poke - a.poke);
console.log(`GLB: ${GLB}`);
console.log(`wrist-band non-skin meshes (|x|>0.18, 0.83<y<1.0): ${rows.length}\n`);
console.log('poke(m) reachX skinX  y     x      layer      name  [mat]');
for (const r of rows) {
  const flag = r.poke > 0 ? '  <== STICKS OUT' : '';
  console.log(
    `${r.poke >= 0 ? '+' : ''}${r.poke.toFixed(3)}  ${r.reachAbsX.toFixed(3)} ${r.skinAbsX.toFixed(3)}  ${r.c.y.toFixed(2)} ${r.c.x.toFixed(2).padStart(6)}  ${r.layer.padEnd(10)} ${r.name}  [${r.mat}]${flag}`,
  );
}
console.log(`\nSTICKS-OUT count (poke>0): ${rows.filter((r) => r.poke > 0).length}`);
