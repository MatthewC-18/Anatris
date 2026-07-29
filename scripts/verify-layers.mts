// Replicates RigModel's layer-tagging pass against the real GLB and reports the
// mesh count per peelable layer, plus how each default toggle state renders.
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
const inWristCuff = (c: THREE.Vector3) => Math.abs(c.x) > 0.18 && c.y >= 0.86 && c.y < 0.96;
const isGroupContainer = (n: string) => /g0\d\d$/.test(n) || /_system/i.test(n) || /^General[_ ]terms$/i.test(n);
const SPIKE_RATIO = 3.5, SPIKE_MAX_M = 0.13;
const isCorruptedSpike = (mesh: THREE.Mesh) => {
  const pos = mesh.geometry.getAttribute('position'); if (!pos || pos.count < 8) return false;
  const step = Math.max(1, Math.floor(pos.count / 160));
  const c = new THREE.Vector3(); const v = new THREE.Vector3(); let n = 0;
  for (let i = 0; i < pos.count; i += step) { v.fromBufferAttribute(pos, i); mesh.localToWorld(v); c.add(v); n++; }
  if (n < 4) return false; c.multiplyScalar(1 / n);
  const d: number[] = [];
  for (let i = 0; i < pos.count; i += step) { v.fromBufferAttribute(pos, i); mesh.localToWorld(v); d.push(v.distanceTo(c)); }
  d.sort((a, b) => a - b); const median = d[d.length >> 1] || 1e-9, max = d[d.length - 1] || 0;
  return max > SPIKE_MAX_M && max / median > SPIKE_RATIO;
};
const center = (m: THREE.Mesh) => { const g = m.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); return g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld); };

interface Tag { layer: string; distalCap: boolean }
const tags: Tag[] = [];
let total = 0;
scene.traverse((o) => {
  const mesh = o as THREE.Mesh;
  if (!mesh.isMesh) return;
  total++;
  const mn = matName(mesh);
  const base = colorForMaterial(mn);
  if (base === null || isGroupContainer(mesh.name)) { tags.push({ layer: 'hidden', distalCap: false }); return; }
  const c = center(mesh);
  if (inDistalRegion(c)) {
    if (materialIsSkin(mn)) tags.push({ layer: 'skin', distalCap: true });
    else tags.push({ layer: 'hidden', distalCap: false });
    return;
  }
  const layer = layerForMaterial(mn);
  if (layer === null) { tags.push({ layer: 'hidden', distalCap: false }); return; }
  if (layer === 'skin') { tags.push({ layer: 'skin', distalCap: false }); return; }
  if (layer === 'connective' && inArmBand(c)) { tags.push({ layer: 'hidden', distalCap: false }); return; }
  if (layer === 'muscle' && inWristCuff(c)) { tags.push({ layer: 'hidden', distalCap: false }); return; }
  if (isCorruptedSpike(mesh)) { tags.push({ layer: 'hidden', distalCap: false }); return; }
  tags.push({ layer, distalCap: false });
});

const kept = tags.filter((t) => t.layer !== 'hidden');
const byLayer = new Map<string, number>();
for (const t of kept) byLayer.set(t.layer, (byLayer.get(t.layer) || 0) + 1);
const distalCap = kept.filter((t) => t.distalCap).length;
const bodySkin = kept.filter((t) => t.layer === 'skin' && !t.distalCap).length;

console.log(`GLB: ${GLB}`);
console.log(`meshes total=${total}  tagged-visible=${kept.length}  hidden=${tags.length - kept.length}`);
console.log('by layer:', Object.fromEntries([...byLayer.entries()].sort()));
console.log(`skin split: distal-cap=${distalCap} (always on)  body-skin=${bodySkin} (peelable)`);

// Simulate each default toggle: what's visible.
const sim = (st: Record<string, boolean>) =>
  kept.filter((t) => (t.distalCap ? true : st[t.layer])).length;
console.log('\nrendered mesh count by toggle state:');
console.log(`  default (skin+muscle+bone, no conn): ${sim({ skin: true, muscle: true, bone: true, connective: false })}`);
console.log(`  skin only:                          ${sim({ skin: true, muscle: false, bone: false, connective: false })}`);
console.log(`  peeled to muscle:                   ${sim({ skin: false, muscle: true, bone: false, connective: false })}`);
console.log(`  bone only:                          ${sim({ skin: false, muscle: false, bone: true, connective: false })}`);
console.log(`  all off (only distal cap remains):  ${sim({ skin: false, muscle: false, bone: false, connective: false })}`);
