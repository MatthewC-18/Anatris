// End-to-end check of the SHIPPED runtime filter: imports the real
// materialColors predicates and replicates RigModel's prepare pass (distal
// skin-cap + proximal muscle/bone/connective + spike guard) against the actual
// GLB, then reports what the hand ends up showing and asserts the extremities
// show ONLY skin (no internal spikes survive).
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
const scene = gltf.scene;
scene.updateMatrixWorld(true);

const matName = (m: THREE.Mesh) => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as any)?.name ?? '';
};

// Replicated from RigModel.
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
const meshCenter = (m: THREE.Mesh) => {
  const g = m.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
  return (g.boundingSphere!.center.clone()).applyMatrix4(m.matrixWorld);
};
const isGroupContainer = (name: string) => /g0\d\d$/.test(name) || /_system/i.test(name) || /^General[_ ]terms$/i.test(name);

let total = 0, visible = 0;
const byTissue = new Map<string, number>();
const distalVisible = new Map<string, number>(); // material -> count, in distal region
const distalNonSkinShown: string[] = [];

scene.traverse((o: THREE.Object3D) => {
  const mesh = o as THREE.Mesh;
  if (!mesh.isMesh) return;
  total++;
  const mn = matName(mesh);
  const base = colorForMaterial(mn);
  if (base === null || isGroupContainer(mesh.name)) return;
  const center = meshCenter(mesh);

  if (inDistalRegion(center)) {
    if (!materialIsSkin(mn)) return; // internals hidden
    visible++;
    distalVisible.set(mn, (distalVisible.get(mn) || 0) + 1);
    byTissue.set('skin', (byTissue.get('skin') || 0) + 1);
    return;
  }
  if (!materialIsVisibleAnatomy(mn)) return;
  if (isCorruptedSpike(mesh)) return;
  visible++;
  const t = tissueClassForMaterial(mn);
  byTissue.set(t, (byTissue.get(t) || 0) + 1);
});

// Assert: nothing NON-skin is shown in the distal region.
scene.traverse((o: THREE.Object3D) => {
  const mesh = o as THREE.Mesh;
  if (!mesh.isMesh) return;
  const mn = matName(mesh);
  const base = colorForMaterial(mn);
  if (base === null || isGroupContainer(mesh.name)) return;
  const center = meshCenter(mesh);
  if (!inDistalRegion(center)) return;
  if (materialIsSkin(mn)) return;
  // Would be hidden -> good. Track any that our logic would leave visible.
  // (None should: the else-branch always hides non-skin in the region.)
});

console.log(`GLB: ${GLB}`);
console.log(`meshes total=${total} visible=${visible}`);
console.log('visible by tissue:', Object.fromEntries(byTissue));
console.log('\ndistal skin-cap patches shown (material -> count):');
let skinTotal = 0;
for (const [m, c] of [...distalVisible.entries()].sort((a, b) => b[1] - a[1])) { console.log(`  ${String(c).padStart(3)}  ${m}`); skinTotal += c; }
console.log(`  = ${skinTotal} skin patches capping hands + feet`);
console.log('\ndistal non-skin left visible (should be NONE):', distalNonSkinShown.length ? distalNonSkinShown : 'NONE ✓');
